import { deletePayment, togglePaymentPaid, updatePaymentInvoice } from "@/app/billing-actions";
import { HistoryBoard, type HistoryPayment } from "@/components/history-board";
import { getPaymentHistory } from "@/lib/billing";

export const dynamic = "force-dynamic";

export default async function HistorialPage() {
  const data = await getPaymentHistory();

  const payments: HistoryPayment[] = data.payments.map((payment) => ({
    id: payment.id,
    companyName: payment.service.company.name,
    serviceName: payment.service.name,
    concept: payment.concept,
    amount: payment.amount,
    currency: payment.currency,
    dueDate: payment.dueDate.toISOString(),
    paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
    status: payment.status,
    method: payment.method,
    invoiceNumber: payment.invoiceNumber,
    notes: payment.notes
  }));

  return (
    <div className="simple-page">
      <HistoryBoard
        payments={payments}
        companies={data.companies}
        totalCollected={data.totalCollected}
        togglePaymentAction={togglePaymentPaid}
        updatePaymentAction={updatePaymentInvoice}
        deletePaymentAction={deletePayment}
      />
    </div>
  );
}
