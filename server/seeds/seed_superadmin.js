(async()=>{
  try{
    const mysql = require('mysql2/promise');
    const bcrypt = require('bcrypt');
    const pool = await mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'f1kd',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      waitForConnections: true,
      connectionLimit: 2,
    });
    const email = 'Superadmin@gmail.com';
    const [rows] = await pool.query('SELECT id,email FROM users WHERE email = ?', [email]);
    if(rows.length){
      console.log('User already exists:', rows[0].email);
      process.exit(0);
    }
    const plain = 'Welcome123!';
    const hash = await bcrypt.hash(plain, 10);
    await pool.query('INSERT INTO users (first_name,last_name,email,role,status,password_hash) VALUES (?,?,?,?,?,?)', ['Super','Admin',email,'Superadmin','Active',hash]);
    console.log('Inserted Superadmin:', email);
    process.exit(0);
  }catch(err){
    console.error('Error inserting Superadmin:', err.message || err);
    process.exit(2);
  }
})();