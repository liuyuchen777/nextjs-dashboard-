import { sql } from '@vercel/postgres';
import {
  MemberField,
  MembersTableType,
  TransactionForm,
  TransactionsTable,
  User,
  FormattedMembersTable,
  LatestInvoiceRaw,
} from './definitions';
import { formatCurrency } from './utils';
import { unstable_noStore as noStore } from 'next/cache';

type CostData = {
  date: string;
  total_cost: number;
};

export async function fetchLatestTransactions() {
  noStore();
  try {
    const data = await sql<LatestInvoiceRaw>`
      SELECT transactions.amount, members.name, members.image_url, members.email, transactions.id, transactions.title, transactions.accountant_book
      FROM transactions
      JOIN members ON transactions.member_id = members.id
      ORDER BY transactions.date DESC
      LIMIT 5`;

    const latestTransactions = data.rows.map((transaction) => ({
      ...transaction,
      amount: formatCurrency(transaction.amount),
    }));
    return latestTransactions;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest transactions.');
  }
}

export async function fetchCardData(startDate?: string, endDate?: string, accountantBook?: string) {
  try {
    console.log("start date and end date: ", startDate, endDate);
    
    const memberCountPromise = sql`SELECT COUNT(*) FROM members`;
    const transactionCountPromise = startDate && endDate 
      ? sql`
          SELECT COUNT(*) 
          FROM transactions 
          WHERE date >= ${startDate} AND date <= ${endDate} AND accountant_book = ${accountantBook}`
      : sql`SELECT COUNT(*) FROM transactions WHERE accountant_book = ${accountantBook}`;
    
    const transactionStatusPromise = startDate && endDate
      ? sql`
          SELECT
            SUM(CASE WHEN status = 'income' THEN amount ELSE 0 END) AS "income",
            SUM(CASE WHEN status = 'cost' THEN amount ELSE 0 END) AS "cost"
          FROM transactions
          WHERE date >= ${startDate} AND date <= ${endDate} AND accountant_book = ${accountantBook}`
      : sql`
          SELECT
            SUM(CASE WHEN status = 'income' THEN amount ELSE 0 END) AS "income",
            SUM(CASE WHEN status = 'cost' THEN amount ELSE 0 END) AS "cost"
          FROM transactions WHERE accountant_book = ${accountantBook}`;

    const data = await Promise.all([
      memberCountPromise,
      transactionCountPromise,
      transactionStatusPromise,
    ]);

    const numberOfMembers = Number(data[0].rows[0].count ?? '0');
    const numberOfTransactions = Number(data[1].rows[0].count ?? '0');    
    const totalIncome = formatCurrency(Number(data[2].rows[0].income ?? '0'));
    const totalCost = formatCurrency(Number(data[2].rows[0].cost ?? '0'));

    return {
      numberOfMembers,
      numberOfTransactions,
      totalIncome,
      totalCost,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredTransactions(
  query: string,
  currentPage: number,
) {
  noStore();
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const transactions = await sql<TransactionsTable>`
      SELECT
        transactions.id,
        transactions.amount,
        transactions.date,
        transactions.status,
        transactions.title,
        transactions.accountant_book,
        members.name,
        members.email,
        members.image_url
      FROM transactions
      JOIN members ON transactions.member_id = members.id
      WHERE
        members.name ILIKE ${`%${query}%`} OR
        members.email ILIKE ${`%${query}%`} OR
        transactions.amount::text ILIKE ${`%${query}%`} OR
        transactions.date::text ILIKE ${`%${query}%`} OR
        transactions.status ILIKE ${`%${query}%`} OR
        transactions.accountant_book ILIKE ${`%${query}%`} OR
        transactions.class ILIKE ${`%${query}%`} OR
        transactions.sub_class ILIKE ${`%${query}%`} OR
        transactions.title ILIKE ${`%${query}%`} OR
        transactions.description ILIKE ${`%${query}%`}
      ORDER BY transactions.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    return transactions.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch transactions.');
  }
}

export async function fetchTransactionsPages(query: string) {
  noStore();
  try {
    const count = await sql`SELECT COUNT(*)
    FROM transactions
    JOIN members ON transactions.member_id = members.id
    WHERE
      members.name ILIKE ${`%${query}%`} OR
      members.email ILIKE ${`%${query}%`} OR
      transactions.amount::text ILIKE ${`%${query}%`} OR
      transactions.date::text ILIKE ${`%${query}%`} OR
      transactions.status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of transactions.');
  }
}

export async function fetchTransactionById(id: string) {
  noStore();
  try {
    const data = await sql<TransactionForm>`
      SELECT
        transactions.id,
        transactions.member_id,
        transactions.amount,
        transactions.status,
        transactions.accountant_book,
        transactions.class,
        transactions.sub_class,
        transactions.title,
        transactions.description,
        transactions.date
      FROM transactions
      WHERE transactions.id = ${id};
    `;

    const transaction = data.rows.map((transaction) => ({
      ...transaction,
      amount: transaction.amount,
    }));
    return transaction[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch transaction.');
  }
}

export async function fetchMembers() {
  try {
    const data = await sql<MemberField>`
      SELECT
        id,
        name
      FROM members
      ORDER BY name ASC
      LIMIT 10
    `;

    const members = data.rows;
    return members;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all members.');
  }
}

export async function fetchFilteredMembers(query: string) {
  noStore();
  try {
    const data = await sql<MembersTableType>`
		SELECT
		  members.id,
		  members.name,
		  members.image_url,
		  COUNT(transactions.id) AS total_transactions,
		  SUM(CASE WHEN transactions.status = 'cost' THEN transactions.amount ELSE 0 END) AS total_cost,
		  SUM(CASE WHEN transactions.status = 'income' THEN transactions.amount ELSE 0 END) AS total_income
		FROM members
		LEFT JOIN transactions ON members.id = transactions.member_id
		WHERE
		  members.name ILIKE ${`%${query}%`}
		  GROUP BY members.id, members.name, members.image_url
		ORDER BY members.name ASC
	  `;

    const members: FormattedMembersTable[] = data.rows.map((member) => ({
      ...member,
      total_cost: formatCurrency(member.total_cost),
      total_income: formatCurrency(member.total_income),
    }));

    return members;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

export async function getUser(email: string) {
  try {
    const user = await sql`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0] as User;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export async function fetchLast14DaysCosts(accountantBook: string) {
  noStore();
  try {
    const data = await sql<CostData>`
      WITH RECURSIVE dates AS (
        SELECT CURRENT_DATE - INTERVAL '13 days' AS date
        UNION ALL
        SELECT date + INTERVAL '1 day'
        FROM dates
        WHERE date < CURRENT_DATE
      )
      SELECT 
        dates.date::date,
        COALESCE(SUM(CASE WHEN transactions.status = 'cost' THEN transactions.amount ELSE 0 END), 0) as total_cost
      FROM dates
      LEFT JOIN transactions ON DATE(transactions.date) = dates.date 
        AND transactions.accountant_book = ${accountantBook}
      GROUP BY dates.date
      ORDER BY dates.date ASC;
    `;

    return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch last 14 days costs.');
  }
}
