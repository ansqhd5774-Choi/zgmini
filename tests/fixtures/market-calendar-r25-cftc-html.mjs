// Synthetic, reduced structural fixture matching the verified official table.
// The original public HTML remains in the user's one-time R25 log; it is not
// checked into the source tree or used as a live data replacement.
export const monthRows=[
 ['January','05*','09','16','23','30'],['February','06','13','20','27'],
 ['March','06','13','20','27'],['April','03','10','17','24'],
 ['May','01','08','15','22','29'],['June','05','12','22*','26'],
 ['July','06*','10','17','24','31'],['August','07','14','21','28'],
 ['September','04','11','18','25'],['October','02','09','16','23','30'],
 ['November','06','16*','20','30*'],['December','04','11','18','28*'],
];
export const mockCftcHtml=({rows=monthRows,year=2026,explanation=true}={})=>
 `<html><head><title>Release Schedule | CFTC</title></head><body><h1>Release Schedule</h1><p>The Commitments of Traders reports are released at 3:30 p.m. Eastern time.</p>`+
 `<h3><strong>${year} Release Schedule</strong></h3><table><tbody><tr><td>Month</td><td colspan="5">Dates</td></tr>`+
 rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')+
 `</tbody></table>${explanation?'<p>*Delayed release date due to a federal holiday.</p>':''}</body></html>`;
