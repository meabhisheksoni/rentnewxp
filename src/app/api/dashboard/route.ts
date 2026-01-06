import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { DbService } from '@/services/dbService';

// GET /api/dashboard - Get dashboard summary
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const summary = await DbService.getDashboardSummary(session.user.id);

        return NextResponse.json(summary);
    } catch (error) {
        console.error('Dashboard API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
}
