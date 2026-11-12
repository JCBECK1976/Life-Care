// v2.14.0 Step 1b item 1: every photo is shrunk before it is sent to the AI. Long edge at most 1568 px (the most the
// AI uses for an image, so no detail is lost), JPEG quality 0.85: a 3–5 MB phone photo becomes about 0.2–0.5 MB.
// The same canvas approach as the Weigh In upload. Images the browser can't decode (or non-images) go as they are.
export var AI_MAX_EDGE = 1568;
export var AI_JPEG_QUALITY = 0.85;

function readDataUrl(file) {
  return new Promise(function(res, rej) { var r = new FileReader(); r.onload = function() { res(String(r.result)); }; r.onerror = function() { rej(new Error("Couldn't read the photo")); }; r.readAsDataURL(file); });
}
function loadImage(url) {
  return new Promise(function(res, rej) { var img = new Image(); img.onload = function() { res(img); }; img.onerror = function() { rej(new Error("decode")); }; img.src = url; });
}

// Returns { data: base64 (no "data:" prefix), mediaType }.
export async function readImageForAI(file, opts) {
  var maxEdge = (opts && opts.maxEdge) || AI_MAX_EDGE; var quality = (opts && opts.quality) || AI_JPEG_QUALITY;
  var url = await readDataUrl(file);
  var type = file.type || "image/jpeg";
  var asIs = { data: url.split(",")[1], mediaType: type };
  if (!/^image\/(jpeg|png|webp|gif|bmp|heic|heif)/.test(type) && !/^data:image\//.test(url)) return asIs;
  try {
    var img = await loadImage(url);
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if (!w || !h) return asIs;
    if (Math.max(w, h) <= maxEdge && file.size <= 1024 * 1024 && type !== "image/heic" && type !== "image/heif") return asIs;   // already small
    var s = Math.min(1, maxEdge / Math.max(w, h));
    var cv = document.createElement("canvas"); cv.width = Math.round(w * s); cv.height = Math.round(h * s);
    var ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
    return { data: cv.toDataURL("image/jpeg", quality).split(",")[1], mediaType: "image/jpeg" };
  } catch (e) { return asIs; }
}
