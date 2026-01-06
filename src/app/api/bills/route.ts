import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { DbService } from '@/services/dbService';

// GET /api/bills?renterId=X&month=Y&year=Z - Get bill with details
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const renterId = parseInt(searchParams.get('renterId') || '', 10);
        const month = parseInt(searchParams.get('month') || '', 10);
        const year = parseInt(searchParams.get('year') || '', 10);

        if (isNaN(renterId) || isNaN(month) || isNaN(year)) {
            return NextResponse.json(
                { error: 'Missing required parameters: renterId, month, year' },
                { status: 400 }
            );
        }

        const billData = await DbService.getBillWithDetails(
            renterId,
            month,
            year,
            session.user.id
        );

        return NextResponse.json(billData);
    } catch (error) {
        console.error('Bills API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch bill' },
            { status: 500 }
        );
    }
}

// POST /api/bills - Save complete bill (bill + expenses + payments)
export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { bill, expenses, payments } = body;

        if (!bill) {
            return NextResponse.json(
                { error: 'Bill data is required' },
                { status: 400 }
            );
        }

        const result = await DbService.saveBillComplete(
            bill,
            expenses || [],
            payments || [],
            session.user.id
        );

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Bills API error:', error);
        return NextResponse.json(
            { error: 'Failed to save bill' },
            { status: 500 }
        );
    }
}
