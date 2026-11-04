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

export const SNACK_TEMPLATES = {
  home: { label: "Home Day", jcKcal: 565, beckKcal: 340, items: "Snack bar after lunch · Porridge pot ~4pm · Protein dessert · Snack bar before bed" },
  office: { label: "Office Day", jcKcal: 350, beckKcal: 290, items: "Porridge pot afternoon only · Protein dessert after dinner" },
  sat: { label: "Saturday", jcKcal: 945, beckKcal: 340, items: "Flexible — treat day allowance" },
};

export const DAY_TYPE = { sun: "home", mon: "home", tue: "home", wed: "office", thu: "office", fri: "home", sat: "sat" };

export const SNACKS = [];

export const JC_BASE = { sun: { bfast: 696, lunch: 500, snacks: 565 }, mon: { bfast: 696, lunch: 400, snacks: 565 }, tue: { bfast: 696, lunch: 400, snacks: 565 }, wed: { bfast: 360, lunch: 580, snacks: 350 }, thu: { bfast: 780, lunch: 580, snacks: 350 }, fri: { bfast: 696, lunch: 400, snacks: 565 }, sat: { bfast: 360, lunch: 380, snacks: 945 } };

export const BECK_BASE = { sun: { bfast: 440, lunch: 400, snacks: 340 }, mon: { bfast: 380, lunch: 360, snacks: 340 }, tue: { bfast: 380, lunch: 360, snacks: 340 }, wed: { bfast: 380, lunch: 340, snacks: 340 }, thu: { bfast: 380, lunch: 340, snacks: 290 }, fri: { bfast: 380, lunch: 360, snacks: 340 }, sat: { bfast: 360, lunch: 320, snacks: 340 } };

export const RC = { GREAT: { bg: "#e0f2fe", text: "#0c4a6e", dot: "#22c55e" }, AMBER: { bg: "#fef3c7", text: "#92400e", dot: "#eab308" }, RED: { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" }, INFO: { bg: "#f1f5f9", text: "#475569", dot: "#94a3b8" } };

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

export const DEFAULT_OTHER_GB = [
  { id: "gb_tea", name: "Tea (milk, no sugar)", jcKcal: 15, beckKcal: 15, rating: "GREAT", freq: "Daily" },
  { id: "gb_coffee", name: "Black Coffee", jcKcal: 5, beckKcal: 5, rating: "GREAT", freq: "Daily" },
  { id: "gb_latte", name: "Latte", jcKcal: 180, beckKcal: 150, rating: "AMBER", freq: "Daily" },
  { id: "gb_cappuccino", name: "Cappuccino", jcKcal: 120, beckKcal: 100, rating: "GREAT", freq: "Daily" },
  { id: "gb_coke_zero", name: "Coke Zero / Diet Drink", jcKcal: 1, beckKcal: 1, rating: "GREAT", freq: "Daily" },
  { id: "gb_orange_juice", name: "Orange Juice (glass)", jcKcal: 110, beckKcal: 90, rating: "AMBER", freq: "Daily" },
  { id: "gb_water", name: "Water / Sparkling Water", jcKcal: 0, beckKcal: 0, rating: "GREAT", freq: "Daily" },
  { id: "gb_protein_shake", name: "Protein Shake", jcKcal: 150, beckKcal: 130, rating: "GREAT", freq: "Daily" },
  { id: "gb_apple", name: "Apple", jcKcal: 80, beckKcal: 70, rating: "GREAT", freq: "Daily" },
  { id: "gb_banana", name: "Banana", jcKcal: 100, beckKcal: 90, rating: "GREAT", freq: "Daily" },
  { id: "gb_crisps", name: "Crisps (packet)", jcKcal: 180, beckKcal: 160, rating: "AMBER", freq: "Daily" },
  { id: "gb_biscuits_2", name: "Biscuits (2)", jcKcal: 130, beckKcal: 120, rating: "AMBER", freq: "Daily" },
  { id: "gb_choc_bar", name: "Chocolate Bar", jcKcal: 240, beckKcal: 220, rating: "RED", freq: "Weekly" },
  { id: "gb_yogurt", name: "Yogurt", jcKcal: 120, beckKcal: 100, rating: "GREAT", freq: "Daily" },
  { id: "gb_protein_bar", name: "Protein Bar", jcKcal: 200, beckKcal: 180, rating: "GREAT", freq: "Daily" },
  { id: "gb_nuts_handful", name: "Nuts (handful)", jcKcal: 180, beckKcal: 160, rating: "GREAT", freq: "Daily" },
  { id: "gb_cheese_crack", name: "Cheese + Crackers", jcKcal: 250, beckKcal: 220, rating: "AMBER", freq: "Daily" },
  { id: "gb_hot_choc", name: "Hot Chocolate", jcKcal: 200, beckKcal: 170, rating: "AMBER", freq: "Daily" },
  { id: "gb_cake_slice", name: "Cake (slice)", jcKcal: 350, beckKcal: 300, rating: "RED", freq: "Weekly" },
  { id: "gb_ice_cream", name: "Ice Cream (2 scoops)", jcKcal: 250, beckKcal: 220, rating: "AMBER", freq: "Weekly" },
  { id: "gb_wine_glass", name: "Wine (glass)", jcKcal: 160, beckKcal: 140, rating: "AMBER", freq: "Weekly" },
  { id: "gb_beer_pint", name: "Beer (pint)", jcKcal: 220, beckKcal: 180, rating: "AMBER", freq: "Weekly" },
  { id: "gb_gin_tonic", name: "Gin + Tonic", jcKcal: 120, beckKcal: 100, rating: "AMBER", freq: "Weekly" },
  { id: "gb_toast_snack", name: "Toast + Butter (1 slice)", jcKcal: 140, beckKcal: 120, rating: "GREAT", freq: "Daily" },
  { id: "gb_boiled_egg", name: "Boiled Egg", jcKcal: 75, beckKcal: 70, rating: "GREAT", freq: "Daily" },
  { id: "gb_cereal_bar", name: "Cereal Bar", jcKcal: 130, beckKcal: 120, rating: "GREAT", freq: "Daily" },
  { id: "gb_fruit_salad", name: "Fruit Salad", jcKcal: 100, beckKcal: 90, rating: "GREAT", freq: "Daily" },
  { id: "gb_popcorn", name: "Popcorn (bag)", jcKcal: 120, beckKcal: 110, rating: "GREAT", freq: "Daily" },
  { id: "gb_smoothie", name: "Smoothie", jcKcal: 200, beckKcal: 170, rating: "GREAT", freq: "Daily" },
  { id: "gb_costa_drink", name: "Costa / Starbucks Drink", jcKcal: 250, beckKcal: 220, rating: "AMBER", freq: "Weekly" }
];
