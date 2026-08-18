const pool = require('../db');

(async ()=>{
  try{
    const names = ['mother_ob_history','mother_vaccinations','mother_vaccines','mother_medical_conditions','child_vaccinations','child_vaccines','child_medical_conditions','child_checkups'];
    for(const n of names){
      const [r] = await pool.query('SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [n]);
      if(r[0].cnt){
        const [create] = await pool.query('SHOW CREATE TABLE `'+n+'`');
        console.log('\n==== TABLE', n, '====\n');
        console.log(create[0]['Create Table']);
      } else {
        console.log('\n==== NO_TABLE', n, '====\n');
      }
    }
    await pool.end();
  }catch(e){ console.error('ERR', e); try{ await pool.end(); }catch{} process.exit(1);} 
})();
