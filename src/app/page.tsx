import {
  createAgendaTask,
  updateCompanyBucket,
  updateCompanyComment
} from "@/app/actions";
import { CompanyDirectory } from "@/components/company-directory";
import { getCompanies } from "@/lib/crm";

export default async function HomePage() {
  const companies = await getCompanies();

  return (
    <div className="simple-page">
      <CompanyDirectory
        companies={companies}
        saveAction={updateCompanyComment}
        moveAction={updateCompanyBucket}
        agendaAction={createAgendaTask}
      />
    </div>
  );
}
