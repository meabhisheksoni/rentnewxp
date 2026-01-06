import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { DbService } from '@/services/dbService';

// GET /api/renters - Get all active renters
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const renters = await DbService.getActiveRenters(session.user.id);

        return NextResponse.json(renters);
    } catch (error) {
        console.error('Renters API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch renters' },
            { status: 500 }
        );
    }
}

// POST /api/renters - Add a new renter
export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        const renterId = await DbService.insertRenter(
            {
                user_id: session.user.id,
                name: body.name,
                email: body.email || null,
                phone: body.phone || null,
                property_address: body.property_address || null,
                monthly_rent: body.monthly_rent || 0,
                move_in_date: body.move_in_date || null,
                is_active: true,
            },
            session.user.id
        );

        return NextResponse.json({ id: renterId }, { status: 201 });
    } catch (error) {
        console.error('Renters API error:', error);
        return NextResponse.json(
            { error: 'Failed to add renter' },
            { status: 500 }
        );
    }
}
