import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"
import { UserProfile, UserProfileFilters, CreateUserProfileRequest } from "@/types/profiles"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    // If user_id is provided, get specific profile (admin only)
    if (userId) {
      if (user.role !== "Manager/Admin") {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        )
      }

      const profile = await getUserProfile(userId)
      return NextResponse.json({ profile })
    }

    // Get current user's profile
    const profile = await getUserProfile(user.id)
    return NextResponse.json({ profile })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const profileData: CreateUserProfileRequest = await request.json()

    // Create or update profile
    const profile = await createOrUpdateProfile(user.id, profileData)
    
    if (!profile) {
      return NextResponse.json(
        { error: "Failed to create profile" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      profile,
      message: "Profile created successfully"
    })
  } catch (error) {
    console.error("Error creating user profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get("user_id") || user.id

    // Check permissions
    if (targetUserId !== user.id && user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const profileData = await request.json()

    // Update profile
    const profile = await createOrUpdateProfile(targetUserId, profileData)
    
    if (!profile) {
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      profile,
      message: "Profile updated successfully"
    })
  } catch (error) {
    console.error("Error updating user profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const profileQuery = `
      SELECT 
        up.*,
        np.email_notifications,
        np.sms_notifications,
        np.push_notifications,
        np.shift_assignments,
        np.shift_reminders,
        np.document_reminders,
        np.system_messages,
        np.marketing_emails,
        np.quiet_hours_start,
        np.quiet_hours_end,
        np.timezone
      FROM user_profiles up
      LEFT JOIN notification_preferences np ON up.user_id = np.user_id
      WHERE up.user_id = $1
    `

    const result = await query(profileQuery, [userId])
    
    if (result.rows.length === 0) {
      // Create default profile if none exists
      return await createDefaultProfile(userId)
    }

    const row = result.rows[0]
    
    const profile: UserProfile = {
      id: row.id,
      user_id: row.user_id,
      phone: row.phone,
      address: row.address,
      city: row.city,
      state: row.state,
      zip_code: row.zip_code,
      date_of_birth: row.date_of_birth,
      hire_date: row.hire_date,
      emergency_contact_name: row.emergency_contact_name,
      emergency_contact_phone: row.emergency_contact_phone,
      emergency_contact_relationship: row.emergency_contact_relationship,
      profile_picture_url: row.profile_picture_url,
      bio: row.bio,
      skills: row.skills || [],
      languages: row.languages || [],
      availability_notes: row.availability_notes,
      preferred_shift_types: row.preferred_shift_types || [],
      transportation_method: row.transportation_method,
      has_own_tools: row.has_own_tools || false,
      safety_certifications: row.safety_certifications || [],
      work_authorization_status: row.work_authorization_status,
      tax_id_last_four: row.tax_id_last_four,
      bank_account_last_four: row.bank_account_last_four,
      notification_preferences: {
        email_notifications: row.email_notifications !== false,
        sms_notifications: row.sms_notifications || false,
        push_notifications: row.push_notifications !== false,
        shift_assignments: row.shift_assignments !== false,
        shift_reminders: row.shift_reminders !== false,
        document_reminders: row.document_reminders !== false,
        system_messages: row.system_messages !== false,
        marketing_emails: row.marketing_emails || false,
        quiet_hours_start: row.quiet_hours_start,
        quiet_hours_end: row.quiet_hours_end,
        timezone: row.timezone || "America/New_York"
      },
      privacy_settings: row.privacy_settings || {
        show_phone_to_coworkers: false,
        show_email_to_coworkers: true,
        show_availability_to_managers: true,
        allow_direct_messages: true,
        show_profile_picture: true,
        show_skills_publicly: true
      },
      created_at: row.created_at,
      updated_at: row.updated_at
    }

    return profile
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return null
  }
}

async function createDefaultProfile(userId: string): Promise<UserProfile | null> {
  try {
    // Create default profile
    const insertProfileQuery = `
      INSERT INTO user_profiles (user_id, skills, languages, preferred_shift_types, safety_certifications)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `

    const profileResult = await query(insertProfileQuery, [
      userId,
      [],
      [],
      [],
      []
    ])

    // Create default notification preferences
    const insertPrefsQuery = `
      INSERT INTO notification_preferences (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `

    await query(insertPrefsQuery, [userId])

    // Return the created profile
    return await getUserProfile(userId)
  } catch (error) {
    console.error("Error creating default profile:", error)
    return null
  }
}

async function createOrUpdateProfile(userId: string, profileData: CreateUserProfileRequest): Promise<UserProfile | null> {
  try {
    // Check if profile exists
    const existingResult = await query("SELECT id FROM user_profiles WHERE user_id = $1", [userId])
    const profileExists = existingResult.rows.length > 0

    if (profileExists) {
      // Update existing profile
      const updateFields: string[] = []
      const updateValues: any[] = []
      let paramIndex = 1

      const fields = [
        "phone", "address", "city", "state", "zip_code", "date_of_birth",
        "hire_date", "emergency_contact_name", "emergency_contact_phone",
        "emergency_contact_relationship", "profile_picture_url", "bio",
        "skills", "languages", "availability_notes", "preferred_shift_types",
        "transportation_method", "has_own_tools", "safety_certifications",
        "work_authorization_status", "tax_id_last_four", "bank_account_last_four"
      ]

      for (const field of fields) {
        if (profileData[field as keyof CreateUserProfileRequest] !== undefined) {
          updateFields.push(`${field} = $${paramIndex}`)
          updateValues.push(profileData[field as keyof CreateUserProfileRequest])
          paramIndex++
        }
      }

      if (profileData.privacy_settings) {
        updateFields.push(`privacy_settings = $${paramIndex}`)
        updateValues.push(JSON.stringify(profileData.privacy_settings))
        paramIndex++
      }

      if (updateFields.length > 0) {
        updateFields.push("updated_at = CURRENT_TIMESTAMP")
        updateValues.push(userId)

        const updateQuery = `
          UPDATE user_profiles 
          SET ${updateFields.join(", ")}
          WHERE user_id = $${paramIndex}
        `

        await query(updateQuery, updateValues)
      }
    } else {
      // Create new profile
      const insertQuery = `
        INSERT INTO user_profiles (
          user_id, phone, address, city, state, zip_code, date_of_birth,
          hire_date, emergency_contact_name, emergency_contact_phone,
          emergency_contact_relationship, profile_picture_url, bio,
          skills, languages, availability_notes, preferred_shift_types,
          transportation_method, has_own_tools, safety_certifications,
          work_authorization_status, tax_id_last_four, bank_account_last_four,
          privacy_settings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      `

      await query(insertQuery, [
        userId,
        profileData.phone,
        profileData.address,
        profileData.city,
        profileData.state,
        profileData.zip_code,
        profileData.date_of_birth,
        profileData.hire_date,
        profileData.emergency_contact_name,
        profileData.emergency_contact_phone,
        profileData.emergency_contact_relationship,
        null, // profile_picture_url will be handled separately
        profileData.bio,
        profileData.skills || [],
        profileData.languages || [],
        profileData.availability_notes,
        profileData.preferred_shift_types || [],
        profileData.transportation_method,
        profileData.has_own_tools || false,
        profileData.safety_certifications || [],
        profileData.work_authorization_status,
        profileData.tax_id_last_four,
        profileData.bank_account_last_four,
        JSON.stringify(profileData.privacy_settings || {})
      ])
    }

    // Update notification preferences if provided
    if (profileData.notification_preferences) {
      const updatePrefsQuery = `
        UPDATE notification_preferences 
        SET 
          email_notifications = COALESCE($1, email_notifications),
          sms_notifications = COALESCE($2, sms_notifications),
          push_notifications = COALESCE($3, push_notifications),
          shift_assignments = COALESCE($4, shift_assignments),
          shift_reminders = COALESCE($5, shift_reminders),
          document_reminders = COALESCE($6, document_reminders),
          system_messages = COALESCE($7, system_messages),
          marketing_emails = COALESCE($8, marketing_emails),
          quiet_hours_start = COALESCE($9, quiet_hours_start),
          quiet_hours_end = COALESCE($10, quiet_hours_end),
          timezone = COALESCE($11, timezone),
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $12
      `

      const prefs = profileData.notification_preferences
      await query(updatePrefsQuery, [
        prefs.email_notifications,
        prefs.sms_notifications,
        prefs.push_notifications,
        prefs.shift_assignments,
        prefs.shift_reminders,
        prefs.document_reminders,
        prefs.system_messages,
        prefs.marketing_emails,
        prefs.quiet_hours_start,
        prefs.quiet_hours_end,
        prefs.timezone,
        userId
      ])
    }

    // Return updated profile
    return await getUserProfile(userId)
  } catch (error) {
    console.error("Error creating/updating profile:", error)
    return null
  }
}
