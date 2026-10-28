// Compact, offline representation of the 2026/2027 official TIC table
// observed in the 2026-10-28 PC HTML. No live network in regression tests.
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const data={
 2026:[
  ['15','','16 (delayed)','',''],['18','','','27 – prelim.',''],
  ['18','18','31','',''],['15','','','30 - final',''],
  ['18','','','',''],['18','18','30','',''],
  ['14','','','',''],['17','','','','31 - prelim.'],
  ['16','16','30','',''],['16','','','','30 - final'],
  ['18','','','',''],['15','15','31','',''],
 ],
 2027:[
  ['19','','','',''],['18','','','26 - prelim.',''],
  ['18','18','31','',''],['15','','','30 - final',''],
  ['18','','','',''],['16','16','30','',''],
  ['16','','','',''],['18','','','','31 - prelim.'],
  ['16','16','30','',''],['20','','','','29 - final'],
  ['19','','','',''],['16','16','30','',''],
 ],
};
const th=[
 'Date: All data releases occur at 4 p.m. Washington, D.C. time*',
 'Monthly: Press release, data on long-term securities',
 'Quarterly: Data on nonfinancial firms, derivatives, portfolio claims and liabilities',
 'Quarterly: U.S. gross external debt',
 'Annual: Foreign portfolio holdings of U.S. securities',
 'Annual: U.S. portfolio holdings of foreign securities',
];
export function mockTicHtml(){
 const yearRows=Object.entries(data).map(([year,rows])=>
  '<tr><td><u>'+year+'</u></td><td colspan=5>&nbsp;</td></tr>'+
  rows.map((days,i)=>'<tr><td><p>'+months[i]+'</p></td>'+
   days.map(day=>'<td><p>'+(day||'&nbsp;')+'</p></td>').join('')+'</tr>').join('')).join('');
 return '<!doctype html><html><body><table><thead><tr>'+
  th.map(s=>'<th><strong>'+s+'</strong></th>').join('')+
  '</tr></thead><tbody>'+yearRows+'</tbody></table></body></html>';
}
