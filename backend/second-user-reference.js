// Script to help create a second test user
// Use this as reference for manual browser registration

const secondUserData = {
  // What to enter in the registration form:
  fullName: 'Second Voter',
  email: 'second.voter@university.edu',
  studentId: '54321',  // This becomes institutionId
  password: 'password123',
  confirmPassword: 'password123'
};

console.log('=== Second User Registration Data ===');
console.log('Full Name:', secondUserData.fullName);
console.log('Email:', secondUserData.email);
console.log('Student/Staff ID:', secondUserData.studentId);
console.log('Password:', secondUserData.password);
console.log('\n📝 Use these credentials to register at: http://localhost:5173/register');
console.log('💡 The system will automatically generate crypto keys during registration');
