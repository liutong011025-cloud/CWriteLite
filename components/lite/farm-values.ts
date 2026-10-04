const values = [
  {id:7,name:'Benevolence',label:'Be kind',meaning:'Be kind and help others.'},
  {id:8,name:'Law-abidingness',label:'Follow rules',meaning:'Follow rules that keep us safe.'},
  {id:9,name:'Empathy',label:'Understand others',meaning:'Think about how others feel.'},
  {id:10,name:'Diligence',label:'Do your best',meaning:'Work carefully and do your best.'},
  {id:11,name:'Filial Piety',label:'Care for family',meaning:'Care for your parents and family.'},
  {id:12,name:'Unity',label:'Work together',meaning:'Work together and help your team.'},
  {id:1,name:'Perseverance',label:'Keep trying',meaning:'Keep trying when things are hard.'},
  {id:2,name:'Respect for Others',label:'Respect others',meaning:'Listen and treat others well.'},
  {id:3,name:'Responsibility',label:'Be responsible',meaning:'Take care of what you need to do.'},
  {id:4,name:'National Identity',label:'Care for our country',meaning:'Learn about and care for your country.'},
  {id:5,name:'Commitment',label:'Keep promises',meaning:'Keep your promises.'},
  {id:6,name:'Integrity',label:'Be honest',meaning:'Be honest and do what is right.'},
];

export function farmValueMeaning(id:number) { return values.find(value=>value.id===id)?.meaning??''; }
// Display the original value name; the plain-English explanation belongs in the growth dialog.
export function farmValueLabel(id:number) { return values.find(value=>value.id===id)?.name??''; }
