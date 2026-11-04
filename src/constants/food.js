// ═══════════════════════════════════════════════════
// MEAL DATABASE
// ═══════════════════════════════════════════════════

export const DINNERS = [];

export const POTATO_SIDES = [
  { id: "baby_potatoes", name: "Baby Potatoes (boiled)", sideCategory: "potato", jcKcal: 130, beckKcal: 100, rating: "GREAT", shop: ["Baby potatoes"] },
  { id: "jacket_potato", name: "Jacket Potato", sideCategory: "potato", jcKcal: 200, beckKcal: 160, rating: "GREAT", shop: ["Baking potatoes"] },
  { id: "mashed_potato", name: "Mashed Potato", sideCategory: "potato", jcKcal: 180, beckKcal: 140, rating: "GREAT", shop: ["Potatoes", "Skimmed milk", "ProActiv spread"] },
  { id: "new_potatoes", name: "New Potatoes", sideCategory: "potato", jcKcal: 130, beckKcal: 100, rating: "GREAT", shop: ["New potatoes"] },
  { id: "roast_potatoes", name: "Roast Potatoes (spray oil)", sideCategory: "potato", jcKcal: 190, beckKcal: 150, rating: "GREAT", shop: ["Potatoes", "Cooking oil spray"] },
  { id: "oven_chips", name: "Oven Chips", sideCategory: "potato", jcKcal: 220, beckKcal: 170, rating: "AMBER", shop: ["Oven chips"] },
  { id: "sweet_potato", name: "Sweet Potato (baked)", sideCategory: "potato", jcKcal: 170, beckKcal: 130, rating: "GREAT", shop: ["Sweet potatoes"] },
  { id: "potato_wedges", name: "Potato Wedges (spray oil)", sideCategory: "potato", jcKcal: 200, beckKcal: 160, rating: "GREAT", shop: ["Potatoes", "Cooking oil spray"] },
  { id: "microwave_rice", name: "Microwave Rice", sideCategory: "potato", jcKcal: 230, beckKcal: 180, rating: "GREAT", shop: ["Microwave rice"] },
];

export const VEG_SIDES = [
  { id: "garden_salad", name: "Garden Salad", sideCategory: "veg", jcKcal: 40, beckKcal: 40, rating: "GREAT", shop: ["Mixed salad leaves", "Cucumber", "Tomatoes"] },
  { id: "steamed_broccoli", name: "Steamed Broccoli", sideCategory: "veg", jcKcal: 55, beckKcal: 45, rating: "GREAT", shop: ["Broccoli"] },
  { id: "mixed_veg", name: "Mixed Vegetables", sideCategory: "veg", jcKcal: 65, beckKcal: 55, rating: "GREAT", shop: ["Frozen mixed vegetables"] },
  { id: "peas", name: "Garden Peas", sideCategory: "veg", jcKcal: 70, beckKcal: 55, rating: "GREAT", shop: ["Frozen peas"] },
  { id: "green_beans", name: "Green Beans", sideCategory: "veg", jcKcal: 35, beckKcal: 30, rating: "GREAT", shop: ["Green beans"] },
  { id: "sweetcorn", name: "Sweetcorn", sideCategory: "veg", jcKcal: 80, beckKcal: 65, rating: "GREAT", shop: ["Frozen sweetcorn"] },
  { id: "coleslaw", name: "Coleslaw (light)", sideCategory: "veg", jcKcal: 70, beckKcal: 55, rating: "AMBER", shop: ["Light coleslaw"] },
  { id: "side_salad_tom", name: "Tomato & Onion Salad", sideCategory: "veg", jcKcal: 35, beckKcal: 30, rating: "GREAT", shop: ["Tomatoes", "Red onion"] },
  { id: "roasted_veg", name: "Roasted Mediterranean Veg", sideCategory: "veg", jcKcal: 90, beckKcal: 75, rating: "GREAT", shop: ["Courgette", "Peppers", "Red onion", "Cooking oil spray"] },
  { id: "corn_on_cob", name: "Corn on the Cob", sideCategory: "veg", jcKcal: 90, beckKcal: 75, rating: "GREAT", shop: ["Corn on the cob"] },
];

export const MEAL_DAYS = [
  { key: "sun", label: "Sun", full: "Sunday", context: "Session 1 · Substantial (45 min)" },
  { key: "mon", label: "Mon", full: "Monday", context: "Session 2 · Quick (20 min)" },
  { key: "tue", label: "Tue", full: "Tuesday", context: "Quick meal (20 min)" },
  { key: "wed", label: "Wed", full: "Wednesday", context: "Beck + boys · Simple" },
  { key: "thu", label: "Thu", full: "Thursday", context: "Dylan football · Quickest (15 min)" },
  { key: "fri", label: "Fri", full: "Friday", context: "Session 3 · Quick (20 min)" },
  { key: "sat", label: "Sat", full: "Saturday", context: "Flexible · Any" },
];

export const DAY_MAP = { sun: "sunday", mon: "monday", tue: "tuesday", wed: "wednesday", thu: "thursday", fri: "friday", sat: "saturday" };

export const BREAKFASTS = [];

export const LUNCHES = [];

export const SNACKS = [];

export const DEFAULT_BREAKFASTS = [
  { id: "gb_porridge", name: "Porridge (oats + milk)", jcKcal: 350, beckKcal: 280, rating: "GREAT" },
  { id: "gb_toast_butter", name: "Toast + Butter (2 slices)", jcKcal: 280, beckKcal: 240, rating: "GREAT" },
  { id: "gb_toast_jam", name: "Toast + Jam (2 slices)", jcKcal: 300, beckKcal: 260, rating: "GREAT" },
  { id: "gb_cereal", name: "Cereal + Semi-Skimmed Milk", jcKcal: 250, beckKcal: 220, rating: "GREAT" },
  { id: "gb_granola", name: "Granola + Yogurt", jcKcal: 420, beckKcal: 350, rating: "AMBER" },
  { id: "gb_full_english", name: "Full English Breakfast", jcKcal: 850, beckKcal: 650, rating: "RED" },
  { id: "gb_scrambled_toast", name: "Scrambled Eggs on Toast", jcKcal: 380, beckKcal: 320, rating: "GREAT" },
  { id: "gb_beans_toast", name: "Beans on Toast", jcKcal: 340, beckKcal: 290, rating: "GREAT" },
  { id: "gb_overnight_oats", name: "Overnight Oats + Berries", jcKcal: 380, beckKcal: 310, rating: "GREAT" },
  { id: "gb_eggs_soldiers", name: "Boiled Eggs + Soldiers", jcKcal: 320, beckKcal: 280, rating: "GREAT" },
  { id: "gb_weetabix", name: "Weetabix + Milk", jcKcal: 200, beckKcal: 180, rating: "GREAT" },
  { id: "gb_yogurt_fruit", name: "Greek Yogurt + Fruit + Honey", jcKcal: 280, beckKcal: 250, rating: "GREAT" },
  { id: "gb_crumpets", name: "Crumpets + Butter (2)", jcKcal: 280, beckKcal: 240, rating: "AMBER" },
  { id: "gb_bacon_sarnie", name: "Bacon Sandwich", jcKcal: 420, beckKcal: 360, rating: "AMBER" },
  { id: "gb_smoked_salmon", name: "Smoked Salmon + Scrambled Eggs", jcKcal: 400, beckKcal: 340, rating: "GREAT" },
  { id: "gb_pancakes", name: "Pancakes + Maple Syrup", jcKcal: 450, beckKcal: 380, rating: "AMBER" },
  { id: "gb_smoothie_bowl", name: "Smoothie Bowl", jcKcal: 350, beckKcal: 300, rating: "GREAT" },
  { id: "gb_avocado_toast", name: "Avocado on Toast", jcKcal: 380, beckKcal: 320, rating: "GREAT" },
  { id: "gb_muesli", name: "Muesli + Milk", jcKcal: 320, beckKcal: 280, rating: "GREAT" },
  { id: "gb_croissant", name: "Croissant + Jam", jcKcal: 350, beckKcal: 300, rating: "AMBER" }
];

export const DEFAULT_LUNCHES = [
  { id: "gb_chicken_sand", name: "Chicken Sandwich", jcKcal: 450, beckKcal: 400, rating: "GREAT" },
  { id: "gb_tuna_sand", name: "Tuna Mayo Sandwich", jcKcal: 480, beckKcal: 420, rating: "GREAT" },
  { id: "gb_ham_sand", name: "Ham + Cheese Sandwich", jcKcal: 460, beckKcal: 400, rating: "GREAT" },
  { id: "gb_blt", name: "BLT Sandwich", jcKcal: 500, beckKcal: 440, rating: "AMBER" },
  { id: "gb_egg_mayo_sand", name: "Egg Mayo Sandwich", jcKcal: 420, beckKcal: 370, rating: "GREAT" },
  { id: "gb_soup_bread", name: "Soup + Bread Roll", jcKcal: 350, beckKcal: 300, rating: "GREAT" },
  { id: "gb_jacket_beans", name: "Jacket Potato + Beans", jcKcal: 450, beckKcal: 380, rating: "GREAT" },
  { id: "gb_jacket_tuna", name: "Jacket Potato + Tuna", jcKcal: 500, beckKcal: 430, rating: "GREAT" },
  { id: "gb_chicken_wrap", name: "Chicken Wrap", jcKcal: 420, beckKcal: 380, rating: "GREAT" },
  { id: "gb_ploughmans", name: "Ploughman's Lunch", jcKcal: 550, beckKcal: 480, rating: "AMBER" },
  { id: "gb_caesar_salad", name: "Chicken Caesar Salad", jcKcal: 400, beckKcal: 350, rating: "GREAT" },
  { id: "gb_pasta_salad", name: "Pasta Salad", jcKcal: 380, beckKcal: 340, rating: "GREAT" },
  { id: "gb_quiche_salad", name: "Quiche + Salad", jcKcal: 480, beckKcal: 420, rating: "AMBER" },
  { id: "gb_pitta_houmous", name: "Pitta + Houmous + Salad", jcKcal: 350, beckKcal: 310, rating: "GREAT" },
  { id: "gb_sausage_roll", name: "Sausage Roll + Crisps", jcKcal: 550, beckKcal: 480, rating: "AMBER" },
  { id: "gb_meal_deal", name: "Supermarket Meal Deal", jcKcal: 600, beckKcal: 520, rating: "AMBER" },
  { id: "gb_beans_cheese_toast", name: "Beans + Cheese on Toast", jcKcal: 420, beckKcal: 370, rating: "GREAT" },
  { id: "gb_omelette", name: "Omelette + Salad", jcKcal: 350, beckKcal: 310, rating: "GREAT" },
  { id: "gb_prawn_sand", name: "Prawn Mayo Sandwich", jcKcal: 440, beckKcal: 390, rating: "GREAT" },
  { id: "gb_noodle_pot", name: "Noodle Pot", jcKcal: 300, beckKcal: 280, rating: "AMBER" }
];

export const DEFAULT_DINNERS_GB = [
  { id: "gb_spag_bol", name: "Spaghetti Bolognese", rating: "GREAT", jcKcal: 550, beckKcal: 470, jcProt: 30, beckProt: 26, jcFat: 14, beckFat: 12, freq: "Weekly", time: 30, shop: [] },
  { id: "gb_chicken_stir_fry", name: "Chicken Stir Fry + Rice", rating: "GREAT", jcKcal: 520, beckKcal: 450, jcProt: 38, beckProt: 32, jcFat: 10, beckFat: 8, freq: "Weekly", time: 20, shop: [] },
  { id: "gb_fish_chips", name: "Fish + Chips", rating: "AMBER", jcKcal: 700, beckKcal: 600, jcProt: 28, beckProt: 24, jcFat: 28, beckFat: 24, freq: "Weekly", time: 30, shop: [] },
  { id: "gb_roast_chicken", name: "Roast Chicken Dinner", rating: "GREAT", jcKcal: 650, beckKcal: 550, jcProt: 42, beckProt: 36, jcFat: 18, beckFat: 15, freq: "Weekly", time: 90, shop: [] },
  { id: "gb_shepherds_pie", name: "Shepherd's Pie", rating: "GREAT", jcKcal: 550, beckKcal: 470, jcProt: 28, beckProt: 24, jcFat: 18, beckFat: 15, freq: "Fortnightly", time: 45, shop: [] },
  { id: "gb_cottage_pie", name: "Cottage Pie", rating: "GREAT", jcKcal: 560, beckKcal: 480, jcProt: 30, beckProt: 26, jcFat: 18, beckFat: 15, freq: "Fortnightly", time: 45, shop: [] },
  { id: "gb_curry_rice", name: "Chicken Curry + Rice", rating: "GREAT", jcKcal: 620, beckKcal: 530, jcProt: 36, beckProt: 30, jcFat: 14, beckFat: 12, freq: "Weekly", time: 30, shop: [] },
  { id: "gb_lasagna", name: "Lasagna", rating: "AMBER", jcKcal: 650, beckKcal: 550, jcProt: 32, beckProt: 28, jcFat: 22, beckFat: 18, freq: "Fortnightly", time: 60, shop: [] },
  { id: "gb_bangers_mash", name: "Bangers + Mash + Gravy", rating: "AMBER", jcKcal: 580, beckKcal: 490, jcProt: 24, beckProt: 20, jcFat: 22, beckFat: 18, freq: "Fortnightly", time: 25, shop: [] },
  { id: "gb_chilli_rice", name: "Chilli Con Carne + Rice", rating: "GREAT", jcKcal: 560, beckKcal: 480, jcProt: 32, beckProt: 28, jcFat: 14, beckFat: 12, freq: "Weekly", time: 35, shop: [] },
  { id: "gb_salmon_veg", name: "Salmon + New Potatoes + Veg", rating: "GREAT", jcKcal: 480, beckKcal: 420, jcProt: 36, beckProt: 30, jcFat: 16, beckFat: 14, freq: "Weekly", time: 25, shop: [] },
  { id: "gb_pizza", name: "Pizza (shop-bought)", rating: "RED", jcKcal: 800, beckKcal: 650, jcProt: 28, beckProt: 22, jcFat: 30, beckFat: 24, freq: "Weekly", time: 15, shop: [] },
  { id: "gb_fajitas", name: "Chicken Fajitas", rating: "GREAT", jcKcal: 550, beckKcal: 470, jcProt: 34, beckProt: 28, jcFat: 14, beckFat: 12, freq: "Weekly", time: 20, shop: [] },
  { id: "gb_mac_cheese", name: "Macaroni Cheese", rating: "AMBER", jcKcal: 600, beckKcal: 500, jcProt: 22, beckProt: 18, jcFat: 24, beckFat: 20, freq: "Fortnightly", time: 25, shop: [] },
  { id: "gb_toad_hole", name: "Toad in the Hole", rating: "AMBER", jcKcal: 620, beckKcal: 520, jcProt: 22, beckProt: 18, jcFat: 28, beckFat: 22, freq: "Monthly", time: 40, shop: [] },
  { id: "gb_gammon_chips", name: "Gammon + Egg + Chips", rating: "AMBER", jcKcal: 680, beckKcal: 580, jcProt: 38, beckProt: 32, jcFat: 24, beckFat: 20, freq: "Fortnightly", time: 25, shop: [] },
  { id: "gb_steak_chips", name: "Steak + Chips + Salad", rating: "AMBER", jcKcal: 700, beckKcal: 600, jcProt: 44, beckProt: 38, jcFat: 26, beckFat: 22, freq: "Monthly", time: 20, shop: [] },
  { id: "gb_chicken_kiev", name: "Chicken Kiev + Mash + Veg", rating: "AMBER", jcKcal: 630, beckKcal: 530, jcProt: 30, beckProt: 26, jcFat: 28, beckFat: 22, freq: "Monthly", time: 30, shop: [] },
  { id: "gb_pork_chop", name: "Pork Chop + Apple Sauce + Veg", rating: "GREAT", jcKcal: 520, beckKcal: 450, jcProt: 38, beckProt: 32, jcFat: 16, beckFat: 14, freq: "Fortnightly", time: 25, shop: [] },
  { id: "gb_fish_pie", name: "Fish Pie", rating: "GREAT", jcKcal: 500, beckKcal: 430, jcProt: 30, beckProt: 26, jcFat: 14, beckFat: 12, freq: "Fortnightly", time: 45, shop: [] },
  { id: "gb_sweet_sour", name: "Sweet + Sour Chicken + Rice", rating: "GREAT", jcKcal: 560, beckKcal: 480, jcProt: 30, beckProt: 26, jcFat: 10, beckFat: 8, freq: "Weekly", time: 20, shop: [] },
  { id: "gb_pasta_bake", name: "Pasta Bake", rating: "GREAT", jcKcal: 540, beckKcal: 460, jcProt: 26, beckProt: 22, jcFat: 14, beckFat: 12, freq: "Weekly", time: 30, shop: [] },
  { id: "gb_risotto", name: "Chicken Risotto", rating: "GREAT", jcKcal: 520, beckKcal: 440, jcProt: 30, beckProt: 26, jcFat: 12, beckFat: 10, freq: "Fortnightly", time: 35, shop: [] },
  { id: "gb_lamb_chops", name: "Lamb Chops + Mint Sauce + Veg", rating: "AMBER", jcKcal: 600, beckKcal: 510, jcProt: 36, beckProt: 30, jcFat: 24, beckFat: 20, freq: "Monthly", time: 20, shop: [] },
  { id: "gb_chinese_take", name: "Chinese Takeaway", rating: "RED", jcKcal: 900, beckKcal: 750, jcProt: 28, beckProt: 24, jcFat: 30, beckFat: 24, freq: "Monthly", time: 0, shop: [] },
  { id: "gb_indian_take", name: "Indian Takeaway", rating: "RED", jcKcal: 950, beckKcal: 800, jcProt: 32, beckProt: 28, jcFat: 35, beckFat: 28, freq: "Monthly", time: 0, shop: [] },
  { id: "gb_burger_chips", name: "Burger + Chips", rating: "AMBER", jcKcal: 750, beckKcal: 620, jcProt: 32, beckProt: 26, jcFat: 30, beckFat: 24, freq: "Fortnightly", time: 20, shop: [] },
  { id: "gb_nandos", name: "Nandos (Chicken + Sides)", rating: "AMBER", jcKcal: 700, beckKcal: 580, jcProt: 48, beckProt: 40, jcFat: 18, beckFat: 14, freq: "Monthly", time: 0, shop: [] },
  { id: "gb_kebab", name: "Kebab", rating: "RED", jcKcal: 850, beckKcal: 700, jcProt: 36, beckProt: 30, jcFat: 34, beckFat: 28, freq: "Monthly", time: 0, shop: [] },
  { id: "gb_fish_finger", name: "Fish Finger Sandwich", rating: "AMBER", jcKcal: 450, beckKcal: 380, jcProt: 20, beckProt: 16, jcFat: 16, beckFat: 14, freq: "Weekly", time: 15, shop: [] },
  { id: "gb_beans_sausage", name: "Beans + Sausages", rating: "AMBER", jcKcal: 420, beckKcal: 360, jcProt: 22, beckProt: 18, jcFat: 16, beckFat: 14, freq: "Weekly", time: 10, shop: [] }
];

