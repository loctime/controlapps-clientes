import {
  createPayment,
  createService,
  deletePayment,
  deleteService,
  generatePayment,
  togglePaymentPaid,
  updateService
} from "@/app/billing-actions";
import { BillingBoard, type PaymentItem, type ServiceItem } from "@/components/billing-board";
import { getBillingData } from "@/lib/billing";

export const dynamic = "force-dynamic";

type RawPayment = {
  id: string;
  serviceId: string;
  concept: string;
  amount: number;
  currency: ServiceItem["currency"];
  dueDate: Date;
  paidAt: Date | null;
  status: PaymentItem["status"];
  method: string | null;
  invoiceNumber: string | null;
  notes: string | null;
};

function toPayment(payment: RawPayment, serviceName: string, companyName: string): PaymentItem {
  return {
    id: payment.id,
    serviceId: payment.serviceId,
    serviceName,
    companyName,
    concept: payment.concept,
    amount: payment.amount,
    currency: payment.currency,
    dueDate: payment.dueDate.toISOString(),
    paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
    status: payment.status,
    method: payment.method,
    invoiceNumber: payment.invoiceNumber,
    notes: payment.notes
  };
}

export default async function ProgramasPage() {
  const data = await getBillingData();

  const services: ServiceItem[] = data.services.map((service) => ({
    id: service.id,
    companyId: service.companyId,
    companyName: service.company.name,
    name: service.name,
    scope: service.scope,
    status: service.status,
    amount: service.amount,
    currency: service.currency,
    billingCycle: service.billingCycle,
    startDate: service.startDate.toISOString(),
    endDate: service.endDate ? service.endDate.toISOString() : null,
    nextDueDate: service.nextDueDate ? service.nextDueDate.toISOString() : null,
    paymentMethod: service.paymentMethod,
    needsInvoice: service.needsInvoice,
    billingContact: service.billingContact,
    billingEmail: service.billingEmail,
    billingPhone: service.billingPhone,
    infraCost: service.infraCost,
    infraNotes: service.infraNotes,
    url: service.url,
    repoUrl: service.repoUrl,
    notes: service.notes,
    payments: service.payments.map((payment) =>
      toPayment(payment, service.name, service.company.name)
    )
  }));

  const mapOpen = (payments: typeof data.overduePayments) =>
    payments.map((payment) =>
      toPayment(payment, payment.service.name, payment.service.company.name)
    );

  return (
    <div className="simple-page">
      <BillingBoard
        services={services}
        companies={data.companies}
        overduePayments={mapOpen(data.overduePayments)}
        upcomingPayments={mapOpen(data.upcomingPayments)}
        stats={data.stats}
        createServiceAction={createService}
        updateServiceAction={updateService}
        deleteServiceAction={deleteService}
        generatePaymentAction={generatePayment}
        createPaymentAction={createPayment}
        togglePaymentAction={togglePaymentPaid}
        deletePaymentAction={deletePayment}
      />
    </div>
  );
}
