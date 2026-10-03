// Injected into MeshPhysicalMaterial. Deforms a unit sphere in local space; +Y is the direction of travel.
uniform float uTime;
uniform float uFlex;
uniform float uStretch;   // axial scale (a)
uniform float uSquash;    // transverse scale (b), kept ≈ 1/sqrt(a) on the CPU for constant volume
uniform float uSkew;      // teardrop asymmetry: tail trails, head stays full
uniform float uWobble;    // low-frequency organic wobble
uniform float uImpact;    // extra head flattening on impact
uniform float uVelocity;  // normalised speed
uniform vec3  uDirection; // lateral lag of the tail in local space
uniform float uNoiseAmount;
uniform float uNeck;      // pinch depth (two connected lobes)
uniform float uNeckPos;
uniform float uBend;
uniform float uFlatY;     // receiver plane in local units (large = no contact)
uniform float uSeed;

vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

float flexSmin(float a, float b, float k){
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

vec3 flexDeform(vec3 p){
  // imperfect, organic silhouette + slow secondary wobble (before anisotropic scaling)
  float n  = snoise(p * 1.15 + vec3(uSeed, uTime * 0.16, 0.0));
  float n2 = snoise(p * 2.4 - vec3(0.0, uTime * 0.3, uSeed));
  float w  = snoise(p * 1.6 + uTime * vec3(0.8, 1.2, 0.9) + uSeed);
  vec3 base = p * (1.0 + uNoiseAmount * (n + 0.15 * n2) + uWobble * 0.025 * w);

  float y = base.y;
  float tail = 0.5 - 0.5 * clamp(y, -1.0, 1.0);          // 0 head … 1 tail
  float neck = 1.0 - uNeck * exp(-pow((y - uNeckPos) / 0.2, 2.0));
  float b = uSquash * neck * (1.0 + 0.3 * uSkew * y);     // fuller head, slimmer tail
  float a = uStretch * (1.0 + 0.9 * uSkew * tail);        // tail elongates more

  vec3 q = vec3(base.x * b, y * a, base.z * b);

  // bend along the path, and the tail lagging behind the direction of travel
  q.x += uBend * q.y * q.y;
  q.xz += uDirection.xz * tail * tail;

  // flatten against the receiver plane with a soft knee, spread sideways to keep volume
  float before = q.y;
  q.y = flexSmin(q.y, uFlatY, 0.14);
  float cut = max(before - q.y, 0.0);
  q.xz *= 1.0 + (0.35 + uImpact) * cut / max(a, 0.6);
  return q;
}

vec3 flexNormal(vec3 p, vec3 d){
  vec3 t = normalize(abs(p.y) < 0.98 ? cross(p, vec3(0.0, 1.0, 0.0)) : cross(p, vec3(1.0, 0.0, 0.0)));
  vec3 bt = normalize(cross(p, t));
  float e = 0.01;
  vec3 pa = flexDeform(normalize(p + t * e));
  vec3 pb = flexDeform(normalize(p + bt * e));
  vec3 n = cross(pa - d, pb - d);
  float l = length(n);
  return l > 1e-12 ? n / l : normalize(p);
}
