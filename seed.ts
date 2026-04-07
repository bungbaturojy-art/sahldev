import { db } from './src/firebase';
import { collection, addDoc, getDocs, query, limit } from 'firebase/firestore';

const seedCatalog = async () => {
  const catalogRef = collection(db, 'pointCatalog');
  const snap = await getDocs(query(catalogRef, limit(1)));
  
  if (snap.empty) {
    const items = [
      { title: 'Melanggar Jam Malam', points: -10, category: 'Pelanggaran' },
      { title: 'Tidak Mengikuti Shalat Berjamaah', points: -5, category: 'Pelanggaran' },
      { title: 'Merokok', points: -50, category: 'Pelanggaran' },
      { title: 'Berkelahi', points: -100, category: 'Pelanggaran' },
      { title: 'Juara Kelas', points: 20, category: 'Prestasi' },
      { title: 'Hafal 1 Juz Baru', points: 50, category: 'Prestasi' },
      { title: 'Membantu Kebersihan Pondok', points: 10, category: 'Prestasi' },
      { title: 'Sopan Santun Teladan', points: 15, category: 'Prestasi' },
    ];

    for (const item of items) {
      await addDoc(catalogRef, item);
    }
    console.log('Catalog seeded!');
  }
};

seedCatalog();
