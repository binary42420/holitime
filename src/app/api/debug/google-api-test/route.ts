import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const apiKey = process.env.GOOGLE_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({
        error: 'Google API key not configured',
        hasApiKey: false
      })
    }

    // Test with a known public Google Sheets document
    const testSheetId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' // Google's sample sheet
    const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${testSheetId}?key=${apiKey}`
    
    console.log('Testing Google Sheets API with URL:', testUrl)
    
    const response = await fetch(testUrl)
    const responseText = await response.text()
    
    return NextResponse.json({
      hasApiKey: true,
      apiKeyLength: apiKey.length,
      testSheetId,
      testUrl,
      responseStatus: response.status,
      responseStatusText: response.statusText,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      responseBody: responseText,
      success: response.ok
    })

  } catch (error) {
    console.error('Error testing Google API:', error)
    return NextResponse.json(
      { error: 'Failed to test Google API' },
      { status: 500 }
    )
  }
}
