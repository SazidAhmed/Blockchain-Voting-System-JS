const firstNames = ['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda',
  'William','Barbara','David','Elizabeth','Richard','Susan','Joseph','Jessica',
  'Thomas','Sarah','Charles','Karen','Christopher','Lisa','Daniel','Nancy',
  'Matthew','Betty','Anthony','Margaret','Mark','Sandra','Donald','Ashley',
  'Steven','Emily','Paul','Donna','Andrew','Michelle','Joshua','Carol',
  'Kenneth','Amanda','Kevin','Dorothy','Brian','Melissa','George','Deborah',
  'Timothy','Stephanie','Ronald','Rebecca','Edward','Sharon','Jason','Laura',
  'Jeffrey','Cynthia','Ryan','Kathleen','Jacob','Amy','Gary','Angela',
  'Nicholas','Shirley','Eric','Anna','Jonathan','Brenda','Stephen','Pamela',
  'Larry','Emma','Justin','Nicole','Scott','Helen','Brandon','Samantha',
  'Benjamin','Katherine','Samuel','Christine','Raymond','Debra','Gregory','Rachel',
  'Frank','Carolyn','Alexander','Janet','Patrick','Maria','Jack','Olivia',
  'Dennis','Heather','Jerry','Amber','Tyler','Denise','Aaron','Megan',
  'Jose','Danielle','Adam','Marilyn','Nathan','Beverly','Henry','Brittany',
  'Douglas','Diana','Zachary','Theresa','Peter','Natalie','Kyle','Kelly',
  'Ethan','Hannah','Walter','Sarah','Noah','Sophia','Jeremy','Evelyn',
  'Christian','Victoria','Harold','Lori','Keith','Lauren','Roger','Alice',
  'Terry','Madison','Gerald','Grace','Sean','Judith','Carl','Julia',
  'Dylan','Catherine','Arthur','Abigail','Lawrence','Alexis','Jordan','Kayla'];

const lastNames = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis',
  'Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas',
  'Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White',
  'Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young',
  'Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
  'Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell',
  'Carter','Roberts','Gomez','Phillips','Evans','Turner','Diaz','Parker',
  'Cruz','Edwards','Collins','Reyes','Stewart','Morris','Morales','Murphy',
  'Cook','Rogers','Gutierrez','Ortiz','Morgan','Cooper','Peterson','Bailey',
  'Reed','Kelly','Howard','Ramos','Kim','Cox','Ward','Richardson',
  'Watson','Brooks','Chavez','Wood','James','Bennett','Gray','Mendoza',
  'Ruiz','Hughes','Price','Alvarez','Castillo','Sanders','Patel','Myers',
  'Long','Ross','Foster','Jimenez','Powell','Jenkins','Perry','Russell',
  'Sullivan','Bell','Coleman','Butler','Henderson','Barnes','Gonzales','Fisher',
  'Vasquez','Simmons','Romero','Jordan','Patterson','Alexander','Hamilton','Graham'];

const stuDepts  = ['Computer Science','Information Technology','Electrical Engineering','Mechanical Engineering','Civil Engineering','Business Administration','Economics','Mathematics','Physics','Chemistry','Biology','Psychology','Sociology','English Literature','History','Political Science','Architecture','Nursing','Pharmacy','Law'];
const teachDepts= ['Computer Science','Electrical Engineering','Mechanical Engineering','Business Administration','Economics','Mathematics','Physics','Chemistry','Biology','Psychology','English','History','Law','Architecture'];
const staffDepts= ['Administration','Finance','Human Resources','IT Support','Library','Student Affairs','Registrar','Security','Facilities','Research Office','International Office'];
const years = ['1st Year','2nd Year','3rd Year','4th Year'];
const pick = (arr, seed) => arr[seed % arr.length];

async function seedMembers(db) {
  const rows = [];

  for (let i = 1; i <= 350; i++) {
    const fn = pick(firstNames, i*7), ln = pick(lastNames, i*13);
    rows.push(['STU' + String(i).padStart(5,'0'), fn+' '+ln,
      fn.toLowerCase()+'.'+ln.toLowerCase()+i+'@university.edu',
      'student', pick(stuDepts, i*3), pick(years, i)]);
  }
  for (let i = 1; i <= 100; i++) {
    const fn = pick(firstNames, i*11+5), ln = pick(lastNames, i*17+3);
    rows.push(['TEACH' + String(i).padStart(4,'0'), 'Dr. '+fn+' '+ln,
      fn.toLowerCase()+'.'+ln.toLowerCase()+'@faculty.university.edu',
      'teacher', pick(teachDepts, i*5), null]);
  }
  for (let i = 1; i <= 50; i++) {
    const fn = pick(firstNames, i*19+9), ln = pick(lastNames, i*23+7);
    rows.push(['STAFF' + String(i).padStart(4,'0'), fn+' '+ln,
      fn.toLowerCase()+'.'+ln.toLowerCase()+'@staff.university.edu',
      'staff', pick(staffDepts, i*7), null]);
  }

  for (let i = 0; i < rows.length; i += 50) {
    await db.query('INSERT INTO institution_members (institution_id, full_name, email, role, department, year_level) VALUES ?', [rows.slice(i, i+50)]);
  }
  console.log('Seeded 500 members: 350 students / 100 teachers / 50 staff');
}

module.exports = { seedMembers };
