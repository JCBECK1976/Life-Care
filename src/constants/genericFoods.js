// v2.19.2: built-in UK generic foods ("Typical values"). Local, no network, no AI. Values are typical UK per 100 g
// (as sold: dried pasta/rice/oats dry, meat and fish raw), with a typical portion. Per-portion values are derived in
// code (per100 × grams ÷ 100), exactly like Open Food Facts items, so the portion stays editable.
// Columns: name, aliases (synonyms and plain words), portion grams, portion description,
//          kcal, protein, fat, satFat, carbs, sugar, fibre, salt  (all per 100 g)
var PASTA = [355, 12.5, 1.5, 0.3, 70, 3, 3, 0.01];
var ROWS = [
  // Dried pasta shapes: 75 g dry per portion
  ["Fusilli pasta (dried)", "pasta spirals twists", 75, "75 g dried", PASTA],
  ["Penne pasta (dried)", "pasta tubes quills penne", 75, "75 g dried", PASTA],
  ["Spaghetti (dried)", "pasta spag spaghetti", 75, "75 g dried", PASTA],
  ["Farfalle pasta (dried)", "pasta bows bowties butterflies", 75, "75 g dried", PASTA],
  ["Conchiglie pasta (dried)", "pasta shells", 75, "75 g dried", PASTA],
  ["Macaroni (dried)", "pasta elbows macaroni", 75, "75 g dried", PASTA],
  ["Rigatoni pasta (dried)", "pasta tubes ridged", 75, "75 g dried", PASTA],
  ["Tagliatelle (dried)", "pasta ribbons nests", 75, "75 g dried", PASTA],
  ["Linguine (dried)", "pasta flat spaghetti", 75, "75 g dried", PASTA],
  ["Lasagne sheets (dried)", "pasta lasagna", 75, "75 g dried (about 4 sheets)", PASTA],
  ["Orzo pasta (dried)", "pasta rice shaped", 75, "75 g dried", PASTA],
  ["Wholewheat fusilli (dried)", "pasta spirals wholemeal brown", 75, "75 g dried", [340, 13.5, 2.5, 0.4, 62, 3, 9, 0.01]],
  ["Egg noodles (dried)", "noodles", 75, "75 g dried (1 nest)", [360, 12, 2.5, 0.6, 70, 2, 3, 0.2]],
  ["Fresh egg pasta", "pasta fresh tortellini", 125, "125 g fresh", [275, 11, 3, 1, 50, 1.5, 2, 0.1]],
  // Rice and grains
  ["White rice (dried)", "rice long grain", 75, "75 g dried", [355, 7, 0.8, 0.2, 79, 0.1, 1.5, 0]],
  ["Basmati rice (dried)", "rice", 75, "75 g dried", [355, 8, 1, 0.2, 78, 0.1, 1.5, 0]],
  ["Brown rice (dried)", "rice wholegrain", 75, "75 g dried", [350, 7.5, 2.8, 0.6, 72, 0.8, 3.5, 0]],
  ["Microwave rice (pouch)", "rice pouch ready", 125, "½ pouch (125 g)", [150, 3, 2, 0.3, 29, 0.3, 1, 0.1]],
  ["Couscous (dried)", "couscous", 60, "60 g dried", [360, 13, 1.5, 0.3, 72, 1, 4, 0.03]],
  ["Porridge oats", "oats oatmeal porridge rolled", 40, "40 g", [375, 11, 8, 1.5, 60, 1, 9, 0.01]],
  ["Wheat biscuits cereal", "cereal biscuits breakfast", 38, "2 biscuits (38 g)", [362, 12, 2, 0.6, 69, 4.4, 10, 0.28]],
  ["Cornflakes", "cereal corn flakes", 30, "30 g", [378, 7, 0.9, 0.2, 84, 8, 3, 1.1]],
  ["Granola", "cereal muesli", 45, "45 g", [450, 9, 17, 4, 62, 20, 7, 0.1]],
  // Potatoes
  ["Potatoes (raw)", "potato spuds new boiled mash mashed", 200, "200 g", [77, 2, 0.1, 0, 17, 0.8, 2.2, 0.02]],
  ["Baking potato", "jacket potato baked", 250, "1 medium (250 g)", [77, 2, 0.1, 0, 17, 0.8, 2.2, 0.02]],
  ["Sweet potato (raw)", "sweet potatoes", 150, "1 small (150 g)", [86, 1.6, 0.1, 0, 20, 4.2, 3, 0.1]],
  ["Oven chips", "chips fries", 125, "125 g", [162, 2.6, 4.2, 0.4, 27, 0.5, 2.5, 0.1]],
  // Bread
  ["White bread", "bread sliced toast loaf", 72, "2 slices (72 g)", [235, 8, 1.9, 0.4, 46, 3, 2.7, 1.0]],
  ["Wholemeal bread", "bread brown sliced toast granary", 72, "2 slices (72 g)", [220, 10, 2.5, 0.5, 38, 2.8, 7, 0.9]],
  ["Bread roll", "roll bap cob", 60, "1 roll (60 g)", [260, 9, 3, 0.7, 49, 3, 2.5, 1.0]],
  ["Bagel", "bagels", 85, "1 bagel (85 g)", [260, 10, 1.5, 0.3, 50, 5, 2.5, 1.0]],
  ["Pitta bread", "pita", 60, "1 pitta (60 g)", [255, 9, 1.2, 0.2, 52, 2.5, 2.5, 1.0]],
  ["Tortilla wrap", "wrap wraps tortilla", 62, "1 wrap (62 g)", [300, 8.5, 7, 3, 50, 3, 2.5, 1.2]],
  // Eggs, dairy, fats
  ["Eggs", "egg boiled scrambled poached fried", 116, "2 large eggs (116 g)", [143, 12.6, 9.9, 2.7, 0.7, 0.4, 0, 0.36]],
  ["Semi-skimmed milk", "milk semi", 200, "1 glass (200 ml)", [50, 3.6, 1.8, 1.1, 4.8, 4.8, 0, 0.1]],
  ["Whole milk", "milk full fat", 200, "1 glass (200 ml)", [64, 3.4, 3.6, 2.4, 4.7, 4.7, 0, 0.1]],
  ["Skimmed milk", "milk", 200, "1 glass (200 ml)", [35, 3.5, 0.1, 0.1, 5, 5, 0, 0.1]],
  ["Cheddar cheese", "cheese cheddar mature mild", 30, "30 g", [416, 25, 35, 22, 0.1, 0.1, 0, 1.8]],
  ["Mozzarella", "cheese mozzarella", 63, "½ ball (63 g)", [250, 18, 19, 13, 1, 1, 0, 0.5]],
  ["Greek yoghurt (0% fat)", "yogurt yoghurt greek fat free", 150, "150 g", [57, 10, 0.2, 0.1, 3.6, 3.6, 0, 0.1]],
  ["Natural yoghurt", "yogurt yoghurt plain", 150, "150 g", [75, 4.5, 3, 2, 7, 7, 0, 0.2]],
  ["Butter", "butter", 10, "10 g", [740, 0.6, 82, 52, 0.6, 0.6, 0, 1.4]],
  ["Olive oil", "oil", 11, "1 tbsp (11 g)", [824, 0, 91, 14, 0, 0, 0, 0]],
  // Meat
  ["Chicken breast (raw)", "chicken fillet", 150, "1 breast (150 g)", [106, 24, 1.1, 0.3, 0, 0, 0, 0.13]],
  ["Chicken thighs, skinless (raw)", "chicken thigh", 150, "2 thighs (150 g)", [120, 19.5, 4.8, 1.3, 0, 0, 0, 0.2]],
  ["Beef mince 5% fat (raw)", "mince minced beef lean", 125, "125 g", [125, 21, 5, 2.2, 0, 0, 0, 0.15]],
  ["Beef mince 20% fat (raw)", "mince minced beef", 125, "125 g", [250, 17, 20, 9, 0, 0, 0, 0.15]],
  ["Turkey mince (raw)", "mince minced turkey", 125, "125 g", [120, 21, 4, 1.2, 0, 0, 0, 0.15]],
  ["Pork chop (raw)", "pork chops loin", 150, "1 chop (150 g)", [150, 21, 7, 2.5, 0, 0, 0, 0.15]],
  ["Back bacon rashers", "bacon rashers", 50, "2 rashers (50 g)", [215, 16.5, 16.5, 6, 0, 0, 0, 3]],
  ["Pork sausages", "sausages bangers", 114, "2 sausages (114 g)", [250, 13, 19, 7, 7, 1.5, 1, 1.6]],
  ["Ham, sliced", "ham slices", 45, "3 slices (45 g)", [110, 18, 3.5, 1.2, 1.5, 1, 0, 2]],
  ["Lamb mince (raw)", "lamb mince minced", 125, "125 g", [230, 17, 18, 8, 0, 0, 0, 0.15]],
  ["Steak, sirloin (raw)", "beef steak", 200, "1 steak (200 g)", [150, 22, 7, 3, 0, 0, 0, 0.15]],
  // Fish
  ["Salmon fillet (raw)", "salmon fish", 120, "1 fillet (120 g)", [200, 20, 13, 2.5, 0, 0, 0, 0.1]],
  ["Cod fillet (raw)", "cod fish white", 140, "1 fillet (140 g)", [80, 18, 0.7, 0.1, 0, 0, 0, 0.2]],
  ["Tuna in spring water (drained)", "tuna tinned canned", 112, "1 small can, drained (112 g)", [110, 25, 1, 0.3, 0, 0, 0, 0.6]],
  ["Prawns, cooked", "prawns shrimp", 100, "100 g", [70, 15, 1, 0.2, 0, 0, 0, 1.0]],
  ["Fish fingers", "fish fingers breaded", 112, "4 fingers (112 g)", [220, 13, 10, 1, 19, 1, 1, 0.6]],
  // Fruit
  ["Apple", "apples", 150, "1 medium (150 g)", [52, 0.3, 0.2, 0, 12, 10, 1.8, 0]],
  ["Banana", "bananas", 120, "1 medium (120 g)", [95, 1.2, 0.3, 0.1, 21, 17, 1.4, 0]],
  ["Orange", "oranges satsuma clementine", 160, "1 medium (160 g)", [40, 1, 0.1, 0, 9, 8.5, 2, 0]],
  ["Pear", "pears", 160, "1 medium (160 g)", [45, 0.4, 0.1, 0, 11, 10, 2.5, 0]],
  ["Grapes", "grapes", 80, "80 g (a handful)", [66, 0.6, 0.1, 0, 15, 15, 0.7, 0]],
  ["Strawberries", "strawberry berries", 80, "80 g", [30, 0.7, 0.3, 0, 6, 5, 2, 0]],
  ["Blueberries", "blueberry berries", 80, "80 g", [57, 0.7, 0.3, 0, 13, 10, 2.4, 0]],
  ["Avocado", "avocados", 80, "½ avocado (80 g)", [160, 2, 15, 3, 2, 0.7, 6.7, 0]],
  // Vegetables and pulses
  ["Broccoli", "broccoli", 80, "80 g", [34, 3.5, 0.6, 0.1, 2.8, 1.7, 2.6, 0.03]],
  ["Carrots", "carrot", 80, "80 g", [35, 0.6, 0.3, 0.1, 7.5, 4.7, 2.8, 0.1]],
  ["Peas (frozen)", "peas petits pois", 80, "80 g", [70, 6, 1.5, 0.3, 9.5, 2.5, 5, 0]],
  ["Sweetcorn", "corn sweetcorn", 80, "80 g", [85, 3, 1.5, 0.2, 15, 5, 2, 0.3]],
  ["Spinach", "spinach", 80, "80 g", [25, 2.8, 0.8, 0.1, 1.6, 1.5, 2.1, 0.1]],
  ["Tomatoes", "tomato cherry", 80, "80 g", [18, 0.7, 0.3, 0.1, 3.1, 3, 1.2, 0]],
  ["Onion", "onions", 80, "80 g", [36, 1.2, 0.2, 0, 7.9, 5.6, 1.4, 0]],
  ["Mushrooms", "mushroom", 80, "80 g", [13, 1.8, 0.5, 0.1, 0.4, 0.2, 1.1, 0]],
  ["Peppers", "pepper bell capsicum", 80, "80 g", [25, 1, 0.3, 0.1, 4.5, 4, 1.7, 0]],
  ["Green beans", "beans fine", 80, "80 g", [25, 1.8, 0.2, 0, 3.2, 2.2, 3, 0]],
  ["Mixed salad leaves", "salad lettuce leaves", 80, "80 g", [15, 1.2, 0.3, 0, 1.7, 1.5, 1.5, 0]],
  ["Courgette", "zucchini courgettes", 80, "80 g", [18, 1.8, 0.4, 0.1, 1.8, 1.7, 1.2, 0]],
  ["Baked beans", "beans tomato sauce", 200, "½ can (200 g)", [80, 4.7, 0.3, 0, 13, 5, 3.8, 0.6]],
  ["Chickpeas (canned, drained)", "chickpeas", 120, "120 g", [120, 7, 2.5, 0.3, 15, 0.5, 5, 0.1]],
  ["Red lentils (dried)", "lentils", 75, "75 g dried", [330, 24, 1.3, 0.2, 49, 2, 11, 0.03]],
  // Snacks and spreads
  ["Almonds", "nuts almond", 30, "30 g (a handful)", [600, 21, 52, 4, 7, 4, 12, 0]],
  ["Houmous", "hummus houmous", 30, "30 g", [300, 7, 26, 2.5, 9, 0.5, 5, 0.9]],
  ["Peanut butter", "peanut butter", 15, "1 tbsp (15 g)", [600, 25, 50, 10, 12, 6, 7, 1]],
];

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); }
export var GENERIC_FOODS = ROWS.map(function(r) {
  var v = r[4];
  return { id: "gen_" + slug(r[0]), name: r[0], aliases: r[1], grams: r[2], desc: r[3],
    per100: { kcal: v[0], protein: v[1], fat: v[2], satFat: v[3], carbs: v[4], sugar: v[5], addedSugar: 0, fibre: v[6], salt: v[7] } };
});
export var GENERIC_LABEL = "Typical values";
