import { NextResponse } from 'next/server';
// import { db } from '@/lib/db';
// import { importHistory } from '@/lib/schema';

export async function GET() {
  // In a real application, you would fetch this data from a database.
  const mockHistory = [
    {
      id: '1',
      fileName: 'import-2023-10-26.csv',
      importedAt: new Date().toISOString(),
      status: 'completed',
      totalRows: 100,
      successfulRows: 100,
      failedRows: 0,
    },
    {
      id: '2',
      fileName: 'timesheet-data.xlsx',
      importedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      status: 'partial',
      totalRows: 50,
      successfulRows: 45,
      failedRows: 5,
      errors: [
        { row: 12, error: 'Invalid employee ID' },
        { row: 25, error: 'Shift time overlaps with existing shift' },
        { row: 30, error: 'Invalid job ID' },
        { row: 41, error: 'Date format incorrect' },
        { row: 48, error: 'Missing required field: hours' },
      ],
    },
    {
      id: '3',
      fileName: 'old-data.csv',
      importedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'failed',
      totalRows: 200,
      successfulRows: 0,
      failedRows: 200,
      errors: [{ row: 1, error: 'File format not supported' }],
    },
  ];

  return NextResponse.json(mockHistory);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // In a real app, you'd validate the body here
    
    console.log('Received import history entry:', body);

    // For now, we'll just log it. In a real app, you'd insert this into a database.
    // For example, using Drizzle ORM:
    // await db.insert(importHistory).values({
    //   fileName: body.fileName,
    //   status: body.status,
    //   totalRows: body.totalRows,
    //   successfulRows: body.successfulRows,
    //   failedRows: body.failedRows,
    //   errors: body.errors,
    // });

    return NextResponse.json({ message: 'History saved' }, { status: 201 });
  } catch (error) {
    console.error('Failed to save import history:', error);
    return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
  }
}
