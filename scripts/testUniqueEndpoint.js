/**
 * Test del endpoint de comisiones únicas
 */
import fetch from 'node-fetch';

async function testUniqueEndpoint() {
  try {
    console.log('🔍 Probando endpoint: GET /api/commissions/unique\n');
    
    const url = 'http://localhost:5000/api/commissions/unique?course_id=2025-programacion-1';
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Count: ${data.count}`);
    console.log(`📝 Note: ${data.note}\n`);
    console.log('Comisiones devueltas:');
    
    data.data.forEach((commission, index) => {
      console.log(`  ${index + 1}. ${commission.name}`);
      console.log(`     - commission_id: ${commission.commission_id}`);
      console.log(`     - career_id: ${commission.career_id}`);
      console.log(`     - course_id: ${commission.course_id}\n`);
    });
    
    console.log('='.repeat(60));
    console.log('CONCLUSIÓN:');
    if (data.count === 2) {
      console.log('✅ El endpoint devuelve solo 2 comisiones (sin duplicados)');
      console.log('   En lugar de 8 (2 comisiones × 4 carreras)');
    } else {
      console.log(`⚠️  Se esperaban 2 comisiones únicas, pero se encontraron ${data.count}`);
    }
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testUniqueEndpoint();
