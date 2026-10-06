/**
 * CampX — Seed data
 * database.md §7
 *
 * Realistic demo data for development. All passwords are hashed versions of
 * the DEMO_PASSWORD printed to the console on every seed run.
 */

export const DEMO_PASSWORD = 'CampX@demo2025';

// ─── Users ────────────────────────────────────────────────────────────────────

export const SEED_USERS = [
  // Admin
  {
    name: 'Admin CampX',
    collegeEmail: 'admin@college.edu',
    prn: '00000001',
    role: 'admin',
    verificationStatus: 'verified',
    department: 'Administration',
    academicYear: 'Staff',
    campus: 'ABC College',
    campusAddress: 'Admin Block, Room 101',
  },

  // Aarav Sharma — the verified reference student (from listing.md / Profile.jsx)
  {
    name: 'Aarav Sharma',
    collegeEmail: 'aarav.sharma@college.edu',
    prn: '12210456',
    role: 'student',
    verificationStatus: 'verified',
    department: 'Computer Engineering',
    academicYear: '3rd Year (Sem 5)',
    campus: 'ABC College',
    campusAddress: 'Hostel Block B, Room 314',
    bio: 'CS student trading tech books, lab equipment, and desk accessories before semester break.',
  },

  // Pending review student
  {
    name: 'Priya Nair',
    collegeEmail: 'priya.nair@college.edu',
    prn: '12210502',
    role: 'student',
    verificationStatus: 'pending_review',
    department: 'Electronics Engineering',
    academicYear: '2nd Year (Sem 4)',
    campus: 'ABC College',
  },

  // Pending (just registered)
  {
    name: 'Rohan Mehta',
    collegeEmail: 'rohan.mehta@college.edu',
    prn: '12210611',
    role: 'student',
    verificationStatus: 'pending',
    department: 'Mechanical Engineering',
    academicYear: '1st Year (Sem 2)',
    campus: 'ABC College',
  },

  // Rejected
  {
    name: 'Sneha Kulkarni',
    collegeEmail: 'sneha.kulkarni@college.edu',
    prn: '12210723',
    role: 'student',
    verificationStatus: 'rejected',
    department: 'Civil Engineering',
    academicYear: '4th Year (Sem 7)',
    campus: 'ABC College',
  },

  // Additional verified students (sellers / buyers)
  {
    name: 'Arjun Desai',
    collegeEmail: 'arjun.desai@college.edu',
    prn: '12210834',
    role: 'student',
    verificationStatus: 'verified',
    department: 'Information Technology',
    academicYear: '3rd Year (Sem 6)',
    campus: 'ABC College',
  },
  {
    name: 'Kavya Iyer',
    collegeEmail: 'kavya.iyer@college.edu',
    prn: '12210945',
    role: 'student',
    verificationStatus: 'verified',
    department: 'Computer Engineering',
    academicYear: '4th Year (Sem 8)',
    campus: 'ABC College',
  },
  {
    name: 'Sameer Joshi',
    collegeEmail: 'sameer.joshi@college.edu',
    prn: '12211056',
    role: 'student',
    verificationStatus: 'verified',
    department: 'Electronics Engineering',
    academicYear: '2nd Year (Sem 3)',
    campus: 'ABC College',
  },
];

// ─── Products (24 across 8 categories, 3 statuses) ───────────────────────────

// Placeholder Cloudinary-style URLs (real uploads would replace these)
function cloudImg(filename) {
  return {
    url: `https://res.cloudinary.com/campx-demo/image/upload/v1700000000/campx/products/${filename}.jpg`,
    publicId: `campx/products/${filename}`,
  };
}

export const SEED_PRODUCTS = [
  // books (6)
  { title: 'Engineering Mathematics Vol. 3', category: 'books', condition: 'good', price: 180, description: 'Sem 5 maths textbook by H.K. Dass. Minor highlighting on ch. 4–6 only.', images: [cloudImg('books_math_vol3'), cloudImg('books_math_vol3_b')], status: 'available' },
  { title: 'Data Structures using C — Reema Thareja', category: 'books', condition: 'like-new', price: 220, description: 'Barely used. All pages intact, no notes.', images: [cloudImg('books_ds_thareja')], status: 'available' },
  { title: 'VLSI Design Textbook (3rd Edition)', category: 'books', condition: 'good', price: 350, description: 'Neil Weste CMOS VLSI. Good condition, sticky tabs inside.', images: [cloudImg('books_vlsi')], status: 'sold' },
  { title: 'Signals and Systems — Oppenheim', category: 'books', condition: 'fair', price: 120, description: 'Worn spine but all content readable. Great for EXTC sem 4.', images: [cloudImg('books_signals')], status: 'available' },
  { title: 'Operating Systems Concepts (Dinosaur)', category: 'books', condition: 'like-new', price: 290, description: 'Silberschatz 10th ed. Used for one exam only.', images: [cloudImg('books_os')], status: 'available' },
  { title: 'Computer Networks — Tanenbaum', category: 'books', condition: 'good', price: 200, description: '5th edition. Highlighted chapters on TCP/IP.', images: [cloudImg('books_cn')], status: 'reserved' },

  // electronics (4)
  { title: 'Scientific Calculator FX-991ES Plus', category: 'electronics', condition: 'good', price: 650, description: 'Casio FX-991ES Plus. All functions work. Battery replaced last month.', images: [cloudImg('elec_calculator'), cloudImg('elec_calculator_b')], status: 'available' },
  { title: 'USB-C Hub 7-in-1', category: 'electronics', condition: 'like-new', price: 800, description: 'HDMI + 3x USB + SD card reader. Used for 2 months.', images: [cloudImg('elec_hub')], status: 'available' },
  { title: 'Arduino Uno R3 Starter Kit', category: 'electronics', condition: 'good', price: 500, description: 'Includes breadboard, jumper wires, LEDs, and resistors. Perfect for mini-projects.', images: [cloudImg('elec_arduino')], status: 'sold' },
  { title: 'Laptop Stand Adjustable Aluminum', category: 'electronics', condition: 'like-new', price: 450, description: 'Height and angle adjustable. Fits 11"–17" laptops.', images: [cloudImg('elec_stand')], status: 'available' },

  // lab-equipment (3)
  { title: 'Lab Coat White (Size M)', category: 'lab-equipment', condition: 'good', price: 120, description: 'Standard white lab coat, size medium. Washed and clean.', images: [cloudImg('lab_coat')], status: 'available' },
  { title: 'Vernier Calipers 150mm — Mitutoyo', category: 'lab-equipment', condition: 'good', price: 280, description: 'Analog vernier caliper. Accurate to 0.02mm. No rust.', images: [cloudImg('lab_calipers')], status: 'available' },
  { title: 'Analog Multimeter — Mastech', category: 'lab-equipment', condition: 'fair', price: 90, description: 'Works fine. One probe slightly bent but functional.', images: [cloudImg('lab_multimeter')], status: 'available' },

  // stationery (2)
  { title: 'Staedtler Drawing Instrument Set', category: 'stationery', condition: 'good', price: 160, description: 'Full compass + protractor + set squares set. Used for engineering drawing.', images: [cloudImg('stat_drawing_set')], status: 'available' },
  { title: 'A1 Drawing Board + Drafting Tape', category: 'stationery', condition: 'fair', price: 200, description: 'Slight warp on one corner but flat enough for use.', images: [cloudImg('stat_drawing_board')], status: 'available' },

  // furniture (2)
  { title: 'Wooden Study Table — Foldable', category: 'furniture', condition: 'good', price: 1200, description: 'Compact foldable table. 60x40cm. Perfect for hostel rooms.', images: [cloudImg('furn_table'), cloudImg('furn_table_b')], status: 'available' },
  { title: 'Study Chair — Mesh Back', category: 'furniture', condition: 'fair', price: 900, description: 'Mesh back chair. Slight wobble in left wheel but sits stable.', images: [cloudImg('furn_chair')], status: 'available' },

  // clothing (2)
  { title: 'College Hoodie (Navy, Size L)', category: 'clothing', condition: 'like-new', price: 350, description: 'Official ABC College hoodie. Worn twice only.', images: [cloudImg('cloth_hoodie')], status: 'available' },
  { title: 'Sports Track Pant (Size M)', category: 'clothing', condition: 'good', price: 120, description: 'Dry-fit material. Good for gym or PT sessions.', images: [cloudImg('cloth_track')], status: 'available' },

  // sports (2)
  { title: 'Badminton Racket — Yonex GR-303', category: 'sports', condition: 'good', price: 280, description: 'Full carbon shaft. Restrung 3 months ago.', images: [cloudImg('sport_racket')], status: 'available' },
  { title: 'Yoga Mat — 6mm Thick', category: 'sports', condition: 'like-new', price: 220, description: 'Non-slip TPE yoga mat. Barely used, comes with carry strap.', images: [cloudImg('sport_yoga')], status: 'available' },

  // other (3)
  { title: 'Desk Lamp — LED with USB Charging Port', category: 'other', condition: 'good', price: 400, description: 'Warm/cool light modes, USB-A charging port on base. Great for night study.', images: [cloudImg('other_lamp'), cloudImg('other_lamp_b')], status: 'available' },
  { title: 'Whiteboard 60x45cm', category: 'other', condition: 'good', price: 250, description: 'Magnetic whiteboard with marker and eraser. Some ghosting but usable.', images: [cloudImg('other_whiteboard')], status: 'available' },
  { title: 'Mini Fridge 20L — Haier', category: 'other', condition: 'fair', price: 2200, description: 'Single-door mini fridge. Works fine. Slight noise from compressor at night.', images: [cloudImg('other_fridge'), cloudImg('other_fridge_b'), cloudImg('other_fridge_c')], status: 'available' },
];
