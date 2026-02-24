import { useMemo } from "react";
import type { Transaction } from "@/lib/transactions";
import { categorizeTransaction } from "@/lib/categorize";

interface SAHStatementProps {
  transactions: Transaction[];
}

const SAH_SERVICE_TYPES = [
  { label: "Nursing care", categories: ["Nursing"] },
  { label: "Allied health and other therapeutic services", categories: ["Allied Health", "Health & Medical"] },
  { label: "Personal care", categories: ["Personal Care", "Support Worker"] },
  { label: "Respite", categories: [] },
  { label: "Domestic assistance", categories: ["Domestic"] },
  { label: "Home maintenance and repairs", categories: ["Housing & Accommodation"] },
  { label: "Meals", categories: ["Meals"] },
  { label: "Community and social participation", categories: ["Community & Social"] },
  { label: "Transport", categories: ["Transport"] },
  { label: "Equipment and supplies", categories: ["Equipment & Supplies"] },
  { label: "Fees and administration", categories: ["Fees & Admin"] },
];

function fmt(n: number): string {
  const abs = Math.abs(n);
  const s = abs % 1 === 0
    ? `$${abs.toLocaleString("en-AU")}.00`
    : `$${abs.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return n < 0 ? `-${s}` : s;
}

function getStatementPeriod(transactions: Transaction[]) {
  if (transactions.length === 0) return { start: "", end: "", monthLabel: "", monthNum: 0, year: 0, quarterLabel: "", qStart: "", qEnd: "", qNum: 0 };
  const dates = transactions.map(t => t.date).filter(Boolean).sort();
  const start = dates[0];
  const end = dates[dates.length - 1];
  const d = new Date(start + "T00:00:00");
  const monthLabel = d.toLocaleString("en-AU", { month: "long", year: "numeric" });
  const monthNum = d.getMonth();
  const year = d.getFullYear();
  const q = Math.ceil((monthNum + 1) / 3);
  const qStartD = new Date(year, (q - 1) * 3, 1);
  const qEndD = new Date(year, q * 3, 0);
  const qStart = `1 ${qStartD.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}`;
  const qEnd = `${qEndD.getDate()} ${qEndD.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}`;
  const quarterLabel = `${qStartD.toLocaleDateString("en-AU", { month: "short" })}–${qEndD.toLocaleDateString("en-AU", { month: "short", year: "numeric" })}`;
  const monthInQ = monthNum - (q - 1) * 3 + 1;
  return { start, end, monthLabel, monthNum, year, quarterLabel, qStart, qEnd, qNum: q, monthInQ };
}

function formatDateGov(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];
  return `${days[d.getDay()]}, ${d.getDate()} ${d.toLocaleString("en-AU", { month: "short" })}`;
}

// ── Styled primitives matching the government template ──

const blueHeaderBg = "bg-[hsl(213,55%,45%)]";
const blueHeaderText = "text-white font-semibold";
const purpleText = "text-[hsl(280,35%,40%)]";
const tealText = "text-[hsl(185,55%,35%)]";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className={`text-[20px] font-semibold ${purpleText} mt-1 mb-2`}>{children}</h2>;
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className={`text-[16px] font-semibold ${tealText} mb-2`}>{children}</h3>;
}

function BlueRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr className={`${blueHeaderBg}`}>
      <td className={`py-1.5 px-3 ${blueHeaderText} text-[14px]`} colSpan={1}>{label}</td>
      <td className={`py-1.5 px-3 ${blueHeaderText} text-right text-[14px] ${bold ? "font-bold" : ""}`}>{value}</td>
    </tr>
  );
}

function DataRow({ label, value, indent, bold }: { label: string; value: string; indent?: boolean; bold?: boolean }) {
  return (
    <tr className="border-b border-[hsl(0,0%,88%)]">
      <td className={`py-1.5 px-3 text-[14px] ${indent ? "pl-8" : ""} ${bold ? "font-semibold" : ""}`}>{label}</td>
      <td className={`py-1.5 px-3 text-right text-[14px] ${bold ? "font-semibold" : ""}`}>{value}</td>
    </tr>
  );
}

function UnknownBox({ label }: { label: string }) {
  return (
    <div className="border-2 border-dashed border-[hsl(40,80%,65%)] bg-[hsl(45,100%,96%)] rounded-[8px] px-4 py-3 text-[13px] text-[hsl(30,60%,40%)] flex items-center gap-2">
      <span className="text-[16px]">⚠</span>
      <span><strong>{label}:</strong> Data unknown — not available from imported statement</span>
    </div>
  );
}

function PageDivider() {
  return <div className="border-t-2 border-[hsl(213,55%,45%)] my-6" />;
}

export default function SAHStatement({ transactions }: SAHStatementProps) {
  const data = useMemo(() => {
    const expenses = transactions.filter(t => t.amount < 0);
    const income = transactions.filter(t => t.amount >= 0);
    const period = getStatementPeriod(transactions);

    const serviceMap = new Map<string, { cost: number; govtSub: number; clientCont: number }>();
    for (const tx of expenses) {
      const { category } = categorizeTransaction(tx.description);
      const sahType = SAH_SERVICE_TYPES.find(s => s.categories.includes(category));
      const label = sahType?.label || "Other services";
      const entry = serviceMap.get(label) || { cost: 0, govtSub: 0, clientCont: 0 };
      entry.cost += Math.abs(tx.amount);
      entry.govtSub += tx.govt_contribution ? Math.abs(tx.govt_contribution) : 0;
      entry.clientCont += tx.client_contribution ? Math.abs(tx.client_contribution) : 0;
      serviceMap.set(label, entry);
    }

    const totalExpenses = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalGovt = expenses.reduce((s, t) => s + (t.govt_contribution ? Math.abs(t.govt_contribution) : 0), 0);
    const totalClient = expenses.reduce((s, t) => s + (t.client_contribution ? Math.abs(t.client_contribution) : 0), 0);
    const totalIncome = income.reduce((s, t) => s + t.amount, 0);

    const detailedExpenses = expenses
      .map(tx => ({ ...tx, category: categorizeTransaction(tx.description).category }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { period, serviceMap, totalExpenses, totalGovt, totalClient, totalIncome, detailedExpenses, income, expenses };
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-[15px]">
        No transactions to display. Upload a statement to populate the SAH template.
      </div>
    );
  }

  const { period, serviceMap, totalExpenses, totalGovt, totalClient, totalIncome, detailedExpenses } = data;
  const startDate = `1 ${new Date(period.start + "T00:00:00").toLocaleDateString("en-AU", { month: "long", year: "numeric" })}`;
  const endD = new Date(period.end + "T00:00:00");
  const endDate = `${endD.getDate()} ${endD.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}`;

  return (
    <div className="max-w-[900px] mx-auto space-y-0 text-[14px] leading-[1.4] print:text-[12px]">

      {/* ═══ PAGE 1: COVER ═══ */}
      <div className={`${blueHeaderBg} rounded-t-[10px] px-5 py-3 flex items-center justify-between`}>
        <div>
          <p className="text-white/80 text-[12px]">Australian Government</p>
          <p className="text-white text-[13px] font-medium">Department of Health, Disability and Ageing</p>
        </div>
        <div className="text-right">
          <p className="text-white text-[18px] font-bold leading-tight">Support</p>
          <p className="text-white/80 text-[13px]">at Home</p>
        </div>
      </div>

      <div className="border border-t-0 rounded-b-[10px] bg-white p-5 space-y-4">
        <h1 className={`text-[24px] font-semibold ${purpleText}`}>Support at Home monthly statement</h1>
        <p className={`text-[15px] italic ${tealText}`}>Statement provided to:</p>

        {/* Client details */}
        <div className="flex gap-8 items-start">
          <UnknownBox label="Client name and address" />
          <div className="text-[14px] space-y-1 min-w-[260px]">
            <div className="flex"><span className="font-bold w-[140px]">Client Name:</span> <UnknownInline /></div>
            <div className="flex"><span className="font-bold w-[140px]">My Aged Care ID No:</span> <UnknownInline /></div>
            <div className="flex"><span className="font-bold w-[140px]">Provider ID:</span> <UnknownInline /></div>
            <div className="flex"><span className="font-bold w-[140px]">Location:</span> <UnknownInline /></div>
          </div>
        </div>

        {/* Notice banner */}
        <div className="bg-[hsl(210,20%,95%)] border border-[hsl(210,20%,85%)] rounded-[8px] p-4 space-y-1">
          <p className="font-bold text-[15px]">This is not an invoice – no payment is required.</p>
          <p className="text-[13px]">This statement includes information relating to the services you received in the previous calendar month.</p>
          <p className="text-[13px]">Please review this statement and discuss any concerns with your provider.</p>
          <p className="text-[13px]">You will receive a separate invoice relating to payment of participant contributions.</p>
        </div>

        {/* Financial summary heading */}
        <h2 className={`text-[20px] font-semibold ${tealText}`}>Financial summary {period.monthLabel}</h2>

        {/* Budget overview — we don't have budget data, show as unknown */}
        <div className="grid grid-cols-2 gap-4">
          <UnknownBox label="Services Budget chart" />
          <UnknownBox label="Assistive Technology Budget chart" />
          <UnknownBox label="Home Modification Budget chart" />
          <UnknownBox label="Restorative Care Budget chart" />
        </div>
        <p className="text-[12px] text-muted-foreground italic">Note: Government subsidy and contribution rate calculated at the full pensioner rate for this template.</p>
      </div>

      <PageDivider />

      {/* ═══ PAGE 2: SAH ONGOING BUDGET & ACCOUNT SUMMARY ═══ */}
      <div className="bg-white border rounded-[10px] p-5 space-y-5">
        <SectionHeading>Support at Home ongoing budget</SectionHeading>
        <SubHeading>Support at Home account summary</SubHeading>
        <p className="text-[13px] text-muted-foreground mb-2">
          Statement calendar month {(period as any).monthInQ || "?"} quarter {period.qNum || "?"}: {startDate} to {endDate}
        </p>

        {/* Budget table */}
        <table className="w-full border-collapse">
          <tbody>
            <BlueRow label="Support at Home quarterly budget" value="Data unknown" />
            <DataRow label="Primary supplement(s) (if applicable)" value="" />
            <DataRow label="Veterans' supplement" value="Data unknown" indent />
            <DataRow label="Support at Home unspent funds" value="Data unknown" />
            <DataRow label="Spending from past month(s) in the same quarter" value="N/A" />
            <BlueRow label={`Available budget on ${startDate}`} value="Data unknown" bold />
          </tbody>
        </table>

        {/* Account summary */}
        <table className="w-full border-collapse mt-3">
          <tbody>
            <BlueRow label={`Quarterly budget balance on ${startDate}`} value="Data unknown" bold />
            <DataRow label="Services delivered (including your contributions)" value={fmt(-totalExpenses)} />
            <DataRow label="Charges from past months" value="Data unknown" />
            <BlueRow label={`Remaining balance as of ${endDate}`} value="Data unknown" bold />
          </tbody>
        </table>

        {/* Service type summary */}
        <SectionHeading>Service type summary</SectionHeading>
        <table className="w-full border-collapse">
          <tbody>
            <BlueRow label={`Budget balance at ${startDate}`} value="Data unknown" />
            <tr className={`${blueHeaderBg}`}>
              <td className={`py-1.5 px-3 ${blueHeaderText} text-[13px]`}>Service type</td>
              <td className={`py-1.5 px-3 ${blueHeaderText} text-right text-[13px]`}>Total cost</td>
            </tr>
            {SAH_SERVICE_TYPES.map(st => {
              const entry = serviceMap.get(st.label);
              const cost = entry ? entry.cost : 0;
              return (
                <tr key={st.label} className="border-b border-[hsl(0,0%,88%)]">
                  <td className="py-1.5 px-3 pl-6 text-[14px]">{st.label}</td>
                  <td className="py-1.5 px-3 text-right text-[14px]">{cost > 0 ? fmt(-cost) : "N/A"}</td>
                </tr>
              );
            })}
            {serviceMap.has("Other services") && (() => {
              const entry = serviceMap.get("Other services")!;
              return (
                <tr className="border-b border-[hsl(0,0%,88%)]">
                  <td className="py-1.5 px-3 pl-6 text-[14px]">Other services</td>
                  <td className="py-1.5 px-3 text-right text-[14px]">{fmt(-entry.cost)}</td>
                </tr>
              );
            })()}
            <tr className="border-b border-[hsl(0,0%,88%)]">
              <td className="py-1.5 px-3 font-semibold text-[14px]">Adjustments or refunds</td>
              <td className="py-1.5 px-3 text-right text-[14px]"></td>
            </tr>
            <DataRow label="Incorrect or missing charges from past months" value="Data unknown" indent />
            <BlueRow label={`Remaining Support at Home quarterly balance as at ${endDate}`} value="Data unknown" bold />
          </tbody>
        </table>
      </div>

      <PageDivider />

      {/* ═══ PAGE 3: DETAILED EXPENSES ═══ */}
      <div className="bg-white border rounded-[10px] p-5 space-y-4">
        <SectionHeading>Detailed expenses</SectionHeading>

        {/* Care management row */}
        <table className="w-full border-collapse mb-3">
          <tbody>
            <tr className={blueHeaderBg}>
              <td className={`py-1.5 px-3 ${blueHeaderText} text-[13px]`}>Care Management</td>
              <td className={`py-1.5 px-3 ${blueHeaderText} text-right text-[13px]`}>Rate</td>
              <td className={`py-1.5 px-3 ${blueHeaderText} text-right text-[13px]`}>Units</td>
            </tr>
            <tr className="border-b border-[hsl(0,0%,88%)]">
              <td className="py-1.5 px-3 text-[14px]">Care management</td>
              <td className="py-1.5 px-3 text-right text-[14px] text-muted-foreground">Data unknown</td>
              <td className="py-1.5 px-3 text-right text-[14px] text-muted-foreground">Data unknown</td>
            </tr>
          </tbody>
        </table>

        {/* Main expenses table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className={blueHeaderBg}>
                <th className={`py-2 px-2 ${blueHeaderText} text-left text-[12px]`}>Date</th>
                <th className={`py-2 px-2 ${blueHeaderText} text-left text-[12px]`}>Service</th>
                <th className={`py-2 px-2 ${blueHeaderText} text-right text-[12px]`}>Rate</th>
                <th className={`py-2 px-2 ${blueHeaderText} text-right text-[12px]`}>Units</th>
                <th className={`py-2 px-2 ${blueHeaderText} text-right text-[12px]`}>Unit cost</th>
                <th className={`py-2 px-2 ${blueHeaderText} text-right text-[12px]`}>Cost</th>
                <th className={`py-2 px-2 ${blueHeaderText} text-right text-[12px]`}>Gov subsidy</th>
                <th className={`py-2 px-2 ${blueHeaderText} text-right text-[12px]`}>Contribution</th>
              </tr>
            </thead>
            <tbody>
              {detailedExpenses.map((tx, i) => (
                <tr key={tx.id} className={`border-b border-[hsl(0,0%,90%)] ${i % 2 === 1 ? "bg-[hsl(210,20%,97%)]" : ""}`}>
                  <td className="py-1.5 px-2 whitespace-nowrap font-semibold text-[13px]">{formatDateGov(tx.date)}</td>
                  <td className="py-1.5 px-2 text-[13px] max-w-[240px]">{tx.description}</td>
                  <td className="py-1.5 px-2 text-right text-[13px] text-muted-foreground">–</td>
                  <td className="py-1.5 px-2 text-right text-[13px] text-muted-foreground">–</td>
                  <td className="py-1.5 px-2 text-right text-[13px] text-muted-foreground">–</td>
                  <td className="py-1.5 px-2 text-right text-[13px] font-medium">{fmt(Math.abs(tx.amount))}</td>
                  <td className="py-1.5 px-2 text-right text-[13px]">
                    {tx.govt_contribution != null ? fmt(Math.abs(tx.govt_contribution)) : "–"}
                  </td>
                  <td className="py-1.5 px-2 text-right text-[13px]">
                    {tx.client_contribution != null ? fmt(Math.abs(tx.client_contribution)) : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={blueHeaderBg}>
                <td className={`py-2 px-2 ${blueHeaderText} text-[13px]`} colSpan={5}>Total</td>
                <td className={`py-2 px-2 ${blueHeaderText} text-right text-[13px]`}>{fmt(totalExpenses)}</td>
                <td className={`py-2 px-2 ${blueHeaderText} text-right text-[13px]`}>{totalGovt > 0 ? fmt(totalGovt) : "–"}</td>
                <td className={`py-2 px-2 ${blueHeaderText} text-right text-[13px]`}>{totalClient > 0 ? fmt(totalClient) : "–"}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Variations */}
        <SectionHeading>Variations from past calendar months</SectionHeading>
        <p className="text-[13px] text-muted-foreground">
          The following information relates to any incorrect or missing charges for services or items from past months. Please contact us if you have any concerns or questions.
        </p>
        <UnknownBox label="Past month variations" />
      </div>

      <PageDivider />

      {/* ═══ PAGE 4: UNSPENT FUNDS ═══ */}
      <div className="bg-white border rounded-[10px] p-5 space-y-4">
        <SectionHeading>Unspent funds</SectionHeading>
        <SubHeading>Support at Home unspent funds</SubHeading>
        <p className="text-[13px]">This information is for your reference only and no action is required from you. The maximum amount of funds you can carry into the next quarter is $1000 or 10% of your ongoing quarterly budget as a $ figure (whichever is higher).</p>

        <table className="w-full border-collapse">
          <tbody>
            <tr className={blueHeaderBg}>
              <td className={`py-1.5 px-3 ${blueHeaderText} text-[13px]`}></td>
              <td className={`py-1.5 px-3 ${blueHeaderText} text-right text-[13px]`}>Balance as of last quarter</td>
            </tr>
            <DataRow label="Unspent funds" value="Data unknown" bold />
          </tbody>
        </table>

        <SubHeading>Unspent funds accrued under Home Care Package program</SubHeading>
        <p className="text-[13px]">Participants can continue to use HCP Commonwealth unspent funds for Support at Home services.</p>

        <table className="w-full border-collapse">
          <tbody>
            <BlueRow label={`HCP Commonwealth unspent funds on ${startDate}`} value="" />
            <DataRow label="Individual's unspent Commonwealth portion" value="N/A" indent />
            <DataRow label="Balance of the individual's notional home care account" value="N/A" indent />
            <DataRow label="Individual's unspent care recipient portion" value="N/A" indent />
            <BlueRow label={`Total available balance on ${startDate}`} value="N/A" bold />
          </tbody>
        </table>

        <table className="w-full border-collapse mt-3">
          <tbody>
            <BlueRow label={`Available HCP Commonwealth unspent funds as of ${endDate}`} value="" />
            <DataRow label="Individual's unspent Commonwealth portion" value="N/A" indent />
            <DataRow label="Balance of the individual's notional home care account" value="N/A" indent />
            <DataRow label="Individual's unspent care recipient portion" value="N/A" indent />
            <BlueRow label={`Total available balance as of ${endDate}`} value="N/A" bold />
          </tbody>
        </table>
      </div>

      <PageDivider />

      {/* ═══ PAGE 5: ASSISTIVE TECHNOLOGY ═══ */}
      <div className="bg-white border rounded-[10px] p-5 space-y-4">
        <SectionHeading>Assistive Technology and Home Modifications (AT-HM) scheme</SectionHeading>
        <SubHeading>Assistive Technology account summary</SubHeading>
        <p className="text-[13px] text-muted-foreground mb-2">
          Statement calendar month {(period as any).monthInQ || "?"} quarter {period.qNum || "?"}: {startDate} to {endDate}
        </p>

        <table className="w-full border-collapse">
          <tbody>
            <BlueRow label="AT short-term – high tier" value="Data unknown" />
            <DataRow label="Supplement(s) (if applicable) — Remote supplement" value="N/A" indent />
            <DataRow label="Additional amount approved (if applicable)" value="N/A" />
            <DataRow label="AT Ongoing – assistance dogs (ongoing maintenance)" value="N/A" />
            <DataRow label="Spending from past month(s)" value="N/A" />
            <DataRow label={`Available budget on ${startDate}`} value="Data unknown" bold />
            <DataRow label="Assistive technology delivered (including your contributions)" value="Data unknown" />
            <DataRow label="Changes from past months" value="Data unknown" />
            <DataRow label={`Remaining balance on ${endDate}`} value="Data unknown" bold />
            <DataRow label="Committed funds" value="Data unknown" />
            <BlueRow label="Remaining balance for allocation period" value="Data unknown" bold />
          </tbody>
        </table>

        <SubHeading>Assistive Technology expense summary</SubHeading>
        <UnknownBox label="AT expense breakdown" />

        <SubHeading>Assistive technology detailed expense information</SubHeading>
        <UnknownBox label="AT detailed expenses" />
      </div>

      <PageDivider />

      {/* ═══ PAGE 7: HOME MODIFICATIONS ═══ */}
      <div className="bg-white border rounded-[10px] p-5 space-y-4">
        <SectionHeading>Home modifications account summary</SectionHeading>

        <table className="w-full border-collapse">
          <tbody>
            <BlueRow label="Home modifications budget" value="Data unknown" />
            <DataRow label="HM short-term – high tier" value="Data unknown" indent />
            <DataRow label="Supplement(s) (if applicable) — Remote supplement" value="N/A" indent />
            <DataRow label="Spending from past month(s)" value="N/A" />
            <DataRow label={`Available budget on ${startDate}`} value="Data unknown" bold />
            <DataRow label="Home modifications delivered (including your contributions)" value="Data unknown" />
            <DataRow label="Changes from past months" value="Data unknown" />
            <DataRow label={`Remaining balance on ${endDate}`} value="Data unknown" bold />
            <DataRow label="Committed funds" value="Data unknown" />
            <BlueRow label="Remaining balance for allocation period" value="Data unknown" bold />
          </tbody>
        </table>

        <SubHeading>Home Modifications expense summary</SubHeading>
        <UnknownBox label="HM expense breakdown" />

        <SubHeading>Home modifications detailed expense information</SubHeading>
        <UnknownBox label="HM detailed expenses" />
      </div>

      <PageDivider />

      {/* ═══ PAGE 9: RESTORATIVE CARE ═══ */}
      <div className="bg-white border rounded-[10px] p-5 space-y-4">
        <SectionHeading>Restorative Care Pathway</SectionHeading>
        <SubHeading>Restorative care summary</SubHeading>

        <table className="w-full border-collapse">
          <tbody>
            <BlueRow label="Restorative care budget" value="Data unknown" />
            <DataRow label="Primary supplement(s) (if applicable)" value="N/A" />
            <DataRow label="Spending from past month(s) within allocated care period" value="Data unknown" />
            <DataRow label={`Available budget on ${startDate}`} value="Data unknown" bold />
            <DataRow label="Services delivered (including your contributions)" value="Data unknown" />
            <DataRow label="Restorative care management" value="Data unknown" />
            <DataRow label="Changes from past months" value="N/A" />
            <BlueRow label={`Remaining balance as at ${endDate}`} value="Data unknown" bold />
          </tbody>
        </table>

        <SubHeading>Restorative care Service type summary</SubHeading>
        <UnknownBox label="Restorative care service breakdown" />

        <SubHeading>Restorative care detailed expenses</SubHeading>
        <UnknownBox label="Restorative care detailed expenses" />
      </div>

      <PageDivider />

      {/* ═══ PAGE 11: CONTACT ═══ */}
      <div className="bg-white border rounded-[10px] p-5 space-y-4">
        <SectionHeading>For more support</SectionHeading>
        <p className="text-[14px]">Please call or email us if you have any questions regarding your statement or would like to discuss financial or hardship support options.</p>

        <div className="bg-[hsl(210,20%,95%)] rounded-[8px] p-4 space-y-2 text-[14px]">
          <p><strong>Aged Care Advocacy Line:</strong> 1800 700 600</p>
          <p className="text-[13px] text-muted-foreground">Monday to Friday – 8:00am–8:00pm | Saturday – 10:00am–4:00pm</p>
          <p className="text-[13px]">Website: <span className="text-[hsl(213,55%,45%)] underline">www.opan.org.au</span></p>
        </div>

        <div className="bg-[hsl(210,20%,95%)] rounded-[8px] p-4 space-y-2 text-[14px]">
          <p><strong>Translation services:</strong> 131 450 (24 hours, 7 days a week)</p>
          <p className="text-[13px]">Website: <span className="text-[hsl(213,55%,45%)] underline">www.tisnational.gov.au</span></p>
        </div>

        <div className="bg-[hsl(210,20%,95%)] rounded-[8px] p-4 space-y-2 text-[14px]">
          <p><strong>My Aged Care:</strong> Freecall 1800 200 422</p>
          <p className="text-[13px] text-muted-foreground">Monday to Friday from 8am to 8pm, and Saturdays 10am to 2pm</p>
          <p className="text-[13px]">Website: <span className="text-[hsl(213,55%,45%)] underline">MyAgedCare.gov.au</span></p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-[12px] text-muted-foreground text-center py-3 mt-2">
        This statement view is auto-generated from your uploaded data. Verify against your official provider statement.
      </div>
    </div>
  );
}

function UnknownInline() {
  return <span className="text-[hsl(30,60%,40%)] bg-[hsl(45,100%,96%)] px-2 py-0.5 rounded text-[13px] border border-dashed border-[hsl(40,80%,65%)]">Data unknown</span>;
}
