import {
    pgTable,
    uuid,
    text,
    integer,
    decimal,
    boolean,
    timestamp,
    date,
    primaryKey,
    unique,
    index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// AUTH.JS TABLES (for NextAuth)
// ============================================================================

export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name'),
    email: text('email').notNull().unique(),
    emailVerified: timestamp('email_verified', { mode: 'date' }),
    image: text('image'),
    password: text('password'), // For credentials auth
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});

export const accounts = pgTable(
    'accounts',
    {
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        type: text('type').notNull(),
        provider: text('provider').notNull(),
        providerAccountId: text('provider_account_id').notNull(),
        refresh_token: text('refresh_token'),
        access_token: text('access_token'),
        expires_at: integer('expires_at'),
        token_type: text('token_type'),
        scope: text('scope'),
        id_token: text('id_token'),
        session_state: text('session_state'),
    },
    (account) => [
        primaryKey({ columns: [account.provider, account.providerAccountId] }),
    ]
);

export const sessions = pgTable('sessions', {
    sessionToken: text('session_token').notNull().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
    'verification_tokens',
    {
        identifier: text('identifier').notNull(),
        token: text('token').notNull(),
        expires: timestamp('expires', { mode: 'date' }).notNull(),
    },
    (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// ============================================================================
// APPLICATION TABLES
// ============================================================================

export const renters = pgTable(
    'renters',
    {
        id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),
        email: text('email'),
        phone: text('phone'),
        propertyAddress: text('property_address'),
        monthlyRent: decimal('monthly_rent', { precision: 10, scale: 2 })
            .notNull()
            .default('0'),
        moveInDate: date('move_in_date'),
        isActive: boolean('is_active').default(true),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
    },
    (table) => [
        index('idx_renters_user_active').on(table.userId, table.isActive),
    ]
);

export const payments = pgTable('payments', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    renterId: integer('renter_id')
        .notNull()
        .references(() => renters.id, { onDelete: 'cascade' }),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    dueDate: timestamp('due_date', { mode: 'date' }),
    status: text('status').default('pending'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});

export const monthlyBills = pgTable(
    'monthly_bills',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        renterId: integer('renter_id')
            .notNull()
            .references(() => renters.id, { onDelete: 'cascade' }),
        month: integer('month').notNull(),
        year: integer('year').notNull(),
        rentAmount: decimal('rent_amount', { precision: 10, scale: 2 })
            .notNull()
            .default('0'),

        // Electricity
        electricityEnabled: boolean('electricity_enabled').default(false),
        electricityInitialReading: integer('electricity_initial_reading').default(0),
        electricityFinalReading: integer('electricity_final_reading').default(0),
        electricityMultiplier: decimal('electricity_multiplier', {
            precision: 5,
            scale: 2,
        }).default('9'),
        electricityReadingDate: date('electricity_reading_date'),
        electricityAmount: decimal('electricity_amount', { precision: 10, scale: 2 }).default('0'),

        // Motor
        motorEnabled: boolean('motor_enabled').default(false),
        motorInitialReading: integer('motor_initial_reading').default(0),
        motorFinalReading: integer('motor_final_reading').default(0),
        motorMultiplier: decimal('motor_multiplier', { precision: 5, scale: 2 }).default('9'),
        motorNumberOfPeople: integer('motor_number_of_people').default(2),
        motorReadingDate: date('motor_reading_date'),
        motorAmount: decimal('motor_amount', { precision: 10, scale: 2 }).default('0'),

        // Water
        waterEnabled: boolean('water_enabled').default(false),
        waterAmount: decimal('water_amount', { precision: 10, scale: 2 }).default('0'),

        // Maintenance
        maintenanceEnabled: boolean('maintenance_enabled').default(false),
        maintenanceAmount: decimal('maintenance_amount', { precision: 10, scale: 2 }).default('0'),

        // Totals
        totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).default('0'),
        totalPayments: decimal('total_payments', { precision: 10, scale: 2 }).default('0'),
        pendingAmount: decimal('pending_amount', { precision: 10, scale: 2 }).default('0'),

        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
        updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
    },
    (table) => [
        unique('unique_renter_month_year').on(table.renterId, table.month, table.year),
        index('idx_monthly_bills_lookup').on(table.userId, table.renterId, table.year, table.month),
        index('idx_monthly_bills_previous').on(table.renterId, table.userId, table.year, table.month),
        index('idx_monthly_bills_pending').on(table.userId, table.pendingAmount),
    ]
);

export const additionalExpenses = pgTable(
    'additional_expenses',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        monthlyBillId: uuid('monthly_bill_id')
            .notNull()
            .references(() => monthlyBills.id, { onDelete: 'cascade' }),
        description: text('description').notNull(),
        amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
        date: date('date').defaultNow(),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
    },
    (table) => [index('idx_expenses_bill').on(table.monthlyBillId)]
);

export const billPayments = pgTable(
    'bill_payments',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        monthlyBillId: uuid('monthly_bill_id')
            .notNull()
            .references(() => monthlyBills.id, { onDelete: 'cascade' }),
        amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
        paymentDate: date('payment_date').defaultNow(),
        paymentType: text('payment_type').default('cash'),
        note: text('note'),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
    },
    (table) => [index('idx_payments_bill').on(table.monthlyBillId)]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
    renters: many(renters),
    monthlyBills: many(monthlyBills),
    accounts: many(accounts),
    sessions: many(sessions),
}));

export const rentersRelations = relations(renters, ({ one, many }) => ({
    user: one(users, {
        fields: [renters.userId],
        references: [users.id],
    }),
    payments: many(payments),
    monthlyBills: many(monthlyBills),
}));

export const monthlyBillsRelations = relations(monthlyBills, ({ one, many }) => ({
    user: one(users, {
        fields: [monthlyBills.userId],
        references: [users.id],
    }),
    renter: one(renters, {
        fields: [monthlyBills.renterId],
        references: [renters.id],
    }),
    expenses: many(additionalExpenses),
    payments: many(billPayments),
}));

export const additionalExpensesRelations = relations(additionalExpenses, ({ one }) => ({
    monthlyBill: one(monthlyBills, {
        fields: [additionalExpenses.monthlyBillId],
        references: [monthlyBills.id],
    }),
}));

export const billPaymentsRelations = relations(billPayments, ({ one }) => ({
    monthlyBill: one(monthlyBills, {
        fields: [billPayments.monthlyBillId],
        references: [monthlyBills.id],
    }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Renter = typeof renters.$inferSelect;
export type NewRenter = typeof renters.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type MonthlyBill = typeof monthlyBills.$inferSelect;
export type NewMonthlyBill = typeof monthlyBills.$inferInsert;
export type AdditionalExpense = typeof additionalExpenses.$inferSelect;
export type NewAdditionalExpense = typeof additionalExpenses.$inferInsert;
export type BillPayment = typeof billPayments.$inferSelect;
export type NewBillPayment = typeof billPayments.$inferInsert;
