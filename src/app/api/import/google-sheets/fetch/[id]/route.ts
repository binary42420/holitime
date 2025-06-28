import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id: googleSheetsId } = await params

    if (!googleSheetsId) {
      return NextResponse.json(
        { error: 'Google Sheets ID is required' },
        { status: 400 }
      )
    }

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
      )
    }

    console.log('Fetching Google Sheets data for ID:', googleSheetsId)

    // First, get the spreadsheet metadata to find all sheets
    const metadataResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetsId}?key=${process.env.GOOGLE_API_KEY}`
    )

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text()
      console.error('Google Sheets API Error (metadata):', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch spreadsheet metadata. Make sure the sheet is publicly accessible.' },
        { status: 400 }
      )
    }

    const metadata = await metadataResponse.json()
    const sheets = metadata.sheets || []

    console.log('Found sheets:', sheets.map((s: any) => s.properties.title))

    // Fetch data from all sheets
    const sheetsData: any = {
      spreadsheetId: googleSheetsId,
      title: metadata.properties.title,
      sheets: []
    }

    for (const sheet of sheets) {
      const sheetTitle = sheet.properties.title
      const sheetId = sheet.properties.sheetId
      
      try {
        // Fetch the data for this sheet
        const dataResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetsId}/values/${encodeURIComponent(sheetTitle)}?key=${process.env.GOOGLE_API_KEY}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`
        )

        if (dataResponse.ok) {
          const sheetData = await dataResponse.json()
          
          sheetsData.sheets.push({
            title: sheetTitle,
            sheetId: sheetId,
            data: sheetData.values || [],
            rowCount: sheet.properties.gridProperties?.rowCount || 0,
            columnCount: sheet.properties.gridProperties?.columnCount || 0
          })
          
          console.log(`Fetched data for sheet "${sheetTitle}": ${sheetData.values?.length || 0} rows`)
        } else {
          console.warn(`Failed to fetch data for sheet "${sheetTitle}"`)
          sheetsData.sheets.push({
            title: sheetTitle,
            sheetId: sheetId,
            data: [],
            error: 'Failed to fetch sheet data',
            rowCount: 0,
            columnCount: 0
          })
        }
      } catch (error) {
        console.error(`Error fetching sheet "${sheetTitle}":`, error)
        sheetsData.sheets.push({
          title: sheetTitle,
          sheetId: sheetId,
          data: [],
          error: error instanceof Error ? error.message : 'Unknown error',
          rowCount: 0,
          columnCount: 0
        })
      }
    }

    console.log('Successfully fetched data from', sheetsData.sheets.length, 'sheets')

    return NextResponse.json({
      success: true,
      data: sheetsData
    })

  } catch (error) {
    console.error('Error fetching Google Sheets data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Google Sheets data' },
      { status: 500 }
    )
  }
}
