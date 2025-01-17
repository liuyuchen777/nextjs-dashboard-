import Image from 'next/image';
import { UpdateTransaction, DeleteTransaction } from '@/app/ui/transactions/buttons';
import TransactionStatus from '@/app/ui/transactions/status';
import { formatDateToLocal, formatCurrency, formatDateTimeToLocal } from '@/app/lib/utils';
import { fetchFilteredTransactions } from '@/app/lib/data';

export default async function TransactionsTable({
  query,
  currentPage,
}: {
  query: string;
  currentPage: number;
}) {
  const transactions = await fetchFilteredTransactions(query, currentPage);

  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          <div className="md:hidden">
            {transactions?.map((transaction) => (
              <div
                key={transaction.id}
                className="mb-2 w-full rounded-md bg-white p-4"
              >
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <div className="mb-2 flex items-center">
                      <Image
                        src={transaction.image_url}
                        className="mr-2 rounded-full"
                        width={28}
                        height={28}
                        alt={`${transaction.name}'s profile picture`}
                      />
                      <p>{transaction.name}</p>
                    </div>
                    <p className="text-md text-black-500">{transaction.title}</p>
                  </div>
                  <TransactionStatus status={transaction.status} />
                </div>
                <div className="flex w-full items-center justify-between pt-4">
                  <div>
                    <p className="text-xl font-medium">
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p>{formatDateToLocal(transaction.date)}</p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <UpdateTransaction id={transaction.id} />
                    <DeleteTransaction id={transaction.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  Member
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Amount
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Date
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Title
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Accountant Book
                </th>
                <th scope="col" className="relative py-3 pl-6 pr-3">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {transactions?.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="flex items-center gap-3">
                      <Image
                        src={transaction.image_url}
                        className="rounded-full"
                        width={28}
                        height={28}
                        alt={`${transaction.name}'s profile picture`}
                      />
                      <p>{transaction.name}</p>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {formatDateTimeToLocal(transaction.date)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <TransactionStatus status={transaction.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {transaction.title}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {transaction.accountant_book}
                  </td>
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="flex justify-end gap-3">
                      <UpdateTransaction id={transaction.id} />
                      <DeleteTransaction id={transaction.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
