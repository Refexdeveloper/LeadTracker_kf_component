import type { Contract } from "@/mocks/contracts";
import ContractAccordionRow from "./ContractAccordionRow";

interface Props {
  contracts: Contract[];
}

const COLUMNS = ["Vendor Name", "Contract Description", "Category", "Date Created", "Value", "Status", "End Date", ""];

export default function ContractTable({ contracts }: Props) {
  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <i className="ri-file-list-3-line text-4xl mb-3"></i>
        <p className="text-sm">No contracts found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr className="border-b border-gray-100">
            {COLUMNS.map((col) => (
              <th
                key={col}
                className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract, idx) => (
            <ContractAccordionRow key={contract.id} contract={contract} isEven={idx % 2 === 0} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
