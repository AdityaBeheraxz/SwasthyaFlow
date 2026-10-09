import {extractReportData} from './report-data';
import {extractPrescriptionData} from './prescription';
export function extractDocumentData(text:string,options:Parameters<typeof extractReportData>[1],documentType='report'){
 if(documentType!=='prescription')return extractReportData(text,options);
 const {warnings,...data}=extractPrescriptionData(text,options.verified);return {data:data as Record<string,unknown>,warnings};
}
