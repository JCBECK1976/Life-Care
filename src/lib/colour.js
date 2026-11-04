export function hexToHsl(hex) { var r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255; var max = Math.max(r,g,b), min = Math.min(r,g,b), h, s, l = (max+min)/2; if (max===min) { h=s=0; } else { var d=max-min; s=l>0.5?d/(2-max-min):d/(max+min); switch(max){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;case b:h=((r-g)/d+4)/6;break;} } return [Math.round(h*360),Math.round(s*100),Math.round(l*100)]; }

export function hslToHex(h,s,l) { s/=100;l/=100; var a=s*Math.min(l,1-l); function f(n){var k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(Math.min(k-3,9-k,1),-1)));} return "#"+[f(0),f(8),f(4)].map(function(x){return x.toString(16).padStart(2,"0");}).join(""); }

export function accentVariant(hex, lightness) { var hsl = hexToHsl(hex); return hslToHex(hsl[0], hsl[1], lightness); }
