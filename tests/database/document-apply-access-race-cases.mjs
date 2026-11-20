export const applyAccessRoles=['family','student','educator','owner','school','district','partner-transition'];
export const applyAccessCases=applyAccessRoles.flatMap(role=>['removal-first','apply-first'].flatMap(direction=>['COMMIT','ROLLBACK'].map(ending=>({role,direction,ending,key:role+':'+direction+':'+ending,label:'Apply access race '+role+' '+direction+' '+ending}))));
