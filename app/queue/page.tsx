
import {T} from '@/components/language-provider';
import { QueueTable } from '@/components/queue-table';
import { PendingList } from '@/components/pending-list';
export default function Queue(){return <div className="container"><div className="eyebrow"><T text={"Facility worklist"}/></div><h1 className="display page-title"><T text={"Reviewer queue"}/></h1><p className="lead"><T text={"Urgent signals remain at the top. Open a case to inspect original sources and record a review decision."}/></p><PendingList/><QueueTable/></div>}
