"""A small urban stream, rendered headless with Cycles, as a citizen's phone would see it.

    blender -b --factory-startup -P video/blender/stream_scene.py -- --variant foam --mode still --out x.jpg
    ... --mode clip --frames 120 --out frames_dir/      (hand-held phone, for the in-app camera feed)

Everything is procedural (no downloaded assets): terrain and water from noise, grass blades, pebbles and
leaves scattered with Geometry Nodes. The results are synthetic, and the video says so.
Variants: clear, stagnant-water, mosquitoes, algal-scum, foam, litter, oil-sheen, sewage, dead-fish.
"""

import argparse
import math
import random
import sys

import bmesh
import bpy
from mathutils import Vector, noise

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--variant", default="clear")
ap.add_argument("--mode", default="still")
ap.add_argument("--out", required=True)
ap.add_argument("--seed", type=int, default=1)
ap.add_argument("--samples", type=int, default=96)
ap.add_argument("--width", type=int, default=1600)
ap.add_argument("--height", type=int, default=1200)
ap.add_argument("--frames", type=int, default=120)
ap.add_argument("--fps", type=int, default=30)
ap.add_argument("--sky_strength", type=float, default=0.15)
ap.add_argument("--exposure", type=float, default=0.0)
A = ap.parse_args(argv)
rng = random.Random(A.seed)
V = A.variant
OFF = Vector((A.seed * 13.7, A.seed * 7.1, 0))
CALM = V in ("stagnant-water", "mosquitoes", "algal-scum", "oil-sheen")
DUSK = V == "mosquitoes"

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
cy = scene.cycles
cy.samples = A.samples
cy.use_denoising = True
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("OPTIX", "CUDA"):
        try:
            prefs.compute_device_type = kind
        except TypeError:
            continue
        prefs.get_devices()
        if any(d.type == kind for d in prefs.devices):
            for d in prefs.devices:
                d.use = d.type == kind
            cy.device = "GPU"
            print("render device", kind)
            break
except Exception as e:  # noqa: BLE001
    print("GPU setup skipped:", e)
scene.render.resolution_x, scene.render.resolution_y = A.width, A.height
scene.render.fps = A.fps
vts = [i.identifier for i in scene.view_settings.bl_rna.properties["view_transform"].enum_items]
scene.view_settings.view_transform = "AgX" if "AgX" in vts else "Filmic"
scene.view_settings.exposure = A.exposure


def principled(m):
    return next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def inp(n, *names):
    for nm in names:
        if nm in n.inputs:
            return n.inputs[nm]
    raise KeyError(names)


def material(name, rgb, rough=0.5, metal=0.0, transm=0.0, subsurf=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = principled(m)
    inp(p, "Base Color").default_value = (*rgb, 1)
    inp(p, "Roughness").default_value = rough
    inp(p, "Metallic").default_value = metal
    if transm:
        inp(p, "Transmission Weight", "Transmission").default_value = transm
    if subsurf:
        inp(p, "Subsurface Weight", "Subsurface").default_value = subsurf
    return m


# ---------------------------------------------------------------- terrain: near bank, channel, far bank
WATER_Z = 0.0
CH = 2.1  # half width of the water


def ground_z(x, y):
    yy = y - 0.45 * math.sin(x * 0.21 + A.seed)
    d = abs(yy)
    if d < CH:
        base = -0.55 + 0.12 * (d / CH) ** 2  # bed
    else:
        base = -0.43 + 0.62 * min(1.0, (d - CH) / 1.3) ** 1.2 + 0.06 * (d - CH) + (0.9 * min(1.0, (yy - CH - 2.0) / 2.0) if yy > CH + 2.0 else 0.0)  # bank rising to the path; the far side climbs to a slope
    n = noise.noise(Vector((x * 0.6, y * 0.6, 0)) + OFF)
    fine = noise.noise(Vector((x * 3.0, y * 3.0, 0)) + OFF)
    edge = math.exp(-((d - CH) / 0.6) ** 2)  # strongest right at the bank edge
    lobe = noise.noise(Vector((x * 1.4, y * 0.3, 7)) + OFF)
    return base + 0.10 * n + 0.025 * fine + 0.16 * edge * lobe


bpy.ops.mesh.primitive_grid_add(x_subdivisions=360, y_subdivisions=260, size=1)
ground = bpy.context.active_object
ground.name = "ground"
ground.scale = (34, 24, 1)
bpy.ops.object.transform_apply(scale=True)
for v in ground.data.vertices:
    v.co.z = ground_z(v.co.x, v.co.y)
bpy.ops.object.shade_smooth()

gm = bpy.data.materials.new("soil")
gm.use_nodes = True
nt = gm.node_tree
bs = principled(gm)
N = nt.nodes
L = nt.links
geo = N.new("ShaderNodeNewGeometry")
sep = N.new("ShaderNodeSeparateXYZ")
L.new(geo.outputs["Position"], sep.inputs[0])
wet = N.new("ShaderNodeMapRange")  # 1 at the waterline, 0 a bit higher
wet.inputs["From Min"].default_value, wet.inputs["From Max"].default_value = WATER_Z + 0.18, WATER_Z - 0.02
L.new(sep.outputs["Z"], wet.inputs["Value"])
n1 = N.new("ShaderNodeTexNoise")
n1.inputs["Scale"].default_value = 3.0
n1.inputs["Detail"].default_value = 10
vor = N.new("ShaderNodeTexVoronoi")
vor.inputs["Scale"].default_value = 55.0
soil = N.new("ShaderNodeValToRGB")
c = soil.color_ramp
c.elements[0].color, c.elements[1].color = (0.11, 0.085, 0.06, 1), (0.30, 0.25, 0.18, 1)
L.new(n1.outputs["Fac"], soil.inputs["Fac"])
pebble = N.new("ShaderNodeMixRGB")
pebble.blend_type = "MULTIPLY"
pebble.inputs["Fac"].default_value = 0.45
L.new(soil.outputs["Color"], pebble.inputs[1])
L.new(vor.outputs["Color"], pebble.inputs[2])
wetcol = N.new("ShaderNodeMixRGB")
wetcol.blend_type = "MULTIPLY"
L.new(wet.outputs["Result"], wetcol.inputs["Fac"])
L.new(pebble.outputs["Color"], wetcol.inputs[1])
wetcol.inputs[2].default_value = (0.45, 0.42, 0.38, 1)
L.new(wetcol.outputs["Color"], inp(bs, "Base Color"))
rough = N.new("ShaderNodeMapRange")
rough.inputs["To Min"].default_value, rough.inputs["To Max"].default_value = 0.9, 0.35
L.new(wet.outputs["Result"], rough.inputs["Value"])
L.new(rough.outputs["Result"], inp(bs, "Roughness"))
bump = N.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = 0.6
bmix = N.new("ShaderNodeMath")
bmix.operation = "ADD"
L.new(n1.outputs["Fac"], bmix.inputs[0])
L.new(vor.outputs["Distance"], bmix.inputs[1])
L.new(bmix.outputs[0], bump.inputs["Height"])
L.new(bump.outputs["Normal"], inp(bs, "Normal"))
ground.data.materials.append(gm)

# ---------------------------------------------------------------- scattered detail with Geometry Nodes
def blade_mesh():
    bm = bmesh.new()
    h, w, segs = 0.28, 0.012, 5
    prev = None
    for i in range(segs + 1):
        t = i / segs
        z, ww, lean = h * t, w * (1 - t) + 0.001, 0.06 * t * t
        a = bm.verts.new((-ww, lean, z))
        b = bm.verts.new((ww, lean, z))
        if prev:
            bm.faces.new((prev[0], prev[1], b, a))
        prev = (a, b)
    me = bpy.data.meshes.new("blade")
    bm.to_mesh(me)
    o = bpy.data.objects.new("blade", me)
    scene.collection.objects.link(o)
    o.location = (0, 0, -50)
    m = bpy.data.materials.new("grass")
    m.use_nodes = True
    gp = principled(m)
    oi = m.node_tree.nodes.new("ShaderNodeObjectInfo")
    ramp = m.node_tree.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.07, 0.17, 0.03, 1)
    ramp.color_ramp.elements[1].color = (0.30, 0.27, 0.10, 1)
    mid = ramp.color_ramp.elements.new(0.6)
    mid.color = (0.13, 0.24, 0.05, 1)
    m.node_tree.links.new(oi.outputs["Random"], ramp.inputs["Fac"])
    m.node_tree.links.new(ramp.outputs["Color"], inp(gp, "Base Color"))
    inp(gp, "Roughness").default_value = 0.55
    me.materials.append(m)
    return o


def pebble_mesh():
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.03, location=(0, 0, -60))
    o = bpy.context.active_object
    for v in o.data.vertices:
        v.co *= 1 + 0.3 * noise.noise(v.co * 40)
    o.scale = (1.3, 1.0, 0.55)
    bpy.ops.object.shade_smooth()
    o.data.materials.append(material("pebble", (0.33, 0.31, 0.28), rough=0.7))
    return o


def leaf_mesh():
    bpy.ops.mesh.primitive_circle_add(vertices=16, radius=0.045, fill_type="NGON", location=(0, 0, -70))
    o = bpy.context.active_object
    o.scale = (1.0, 0.55, 1)
    o.data.materials.append(material("leaf", rng.choice([(0.36, 0.20, 0.06), (0.30, 0.25, 0.08), (0.22, 0.14, 0.05)]), rough=0.6, subsurf=0.05))
    return o


def scatter(target, inst_obj, density, z_lo, z_hi, scale=(0.6, 1.4), tilt=0.35, name="scatter", seed=0):
    ng = bpy.data.node_groups.new(name, "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    n, l = ng.nodes, ng.links
    gi, go = n.new("NodeGroupInput"), n.new("NodeGroupOutput")
    dist = n.new("GeometryNodeDistributePointsOnFaces")
    dist.inputs["Density"].default_value = density
    dist.inputs["Seed"].default_value = seed + A.seed
    pos = n.new("GeometryNodeInputPosition")
    sx = n.new("ShaderNodeSeparateXYZ")
    l.new(pos.outputs["Position"], sx.inputs[0])
    lo = n.new("FunctionNodeCompare")
    lo.data_type, lo.operation = "FLOAT", "GREATER_THAN"
    lo.inputs[1].default_value = z_lo
    hi = n.new("FunctionNodeCompare")
    hi.data_type, hi.operation = "FLOAT", "LESS_THAN"
    hi.inputs[1].default_value = z_hi
    l.new(sx.outputs["Z"], lo.inputs[0])
    l.new(sx.outputs["Z"], hi.inputs[0])
    band = n.new("FunctionNodeBooleanMath")
    band.operation = "AND"
    l.new(lo.outputs[0], band.inputs[0])
    l.new(hi.outputs[0], band.inputs[1])
    clump = n.new("ShaderNodeTexNoise")  # clumps, not an even carpet
    clump.inputs["Scale"].default_value = 1.6
    gt = n.new("FunctionNodeCompare")
    gt.data_type, gt.operation = "FLOAT", "GREATER_THAN"
    gt.inputs[1].default_value = 0.42
    l.new(clump.outputs["Fac"], gt.inputs[0])
    sel = n.new("FunctionNodeBooleanMath")
    sel.operation = "AND"
    l.new(band.outputs[0], sel.inputs[0])
    l.new(gt.outputs[0], sel.inputs[1])
    l.new(gi.outputs[0], dist.inputs["Mesh"])
    l.new(sel.outputs[0], dist.inputs["Selection"])
    oi = n.new("GeometryNodeObjectInfo")
    oi.inputs["Object"].default_value = inst_obj
    iop = n.new("GeometryNodeInstanceOnPoints")
    l.new(dist.outputs["Points"], iop.inputs["Points"])
    l.new(oi.outputs["Geometry"], iop.inputs["Instance"])
    rr = n.new("FunctionNodeRandomValue")
    rr.data_type = "FLOAT_VECTOR"
    rr.inputs["Min"].default_value = (-tilt, -tilt, 0)
    rr.inputs["Max"].default_value = (tilt, tilt, 6.283)
    l.new(rr.outputs["Value"], iop.inputs["Rotation"])
    rs = n.new("FunctionNodeRandomValue")
    rs.data_type = "FLOAT"
    fmin = next(i for i in rs.inputs if i.name == "Min" and i.type == "VALUE")
    fmax = next(i for i in rs.inputs if i.name == "Max" and i.type == "VALUE")
    fmin.default_value, fmax.default_value = scale
    fval = next(o for o in rs.outputs if o.name == "Value" and o.type == "VALUE")
    l.new(fval, iop.inputs["Scale"])
    join = n.new("GeometryNodeJoinGeometry")
    l.new(gi.outputs[0], join.inputs[0])
    l.new(iop.outputs["Instances"], join.inputs[0])
    l.new(join.outputs[0], go.inputs[0])
    mod = target.modifiers.new(name, "NODES")
    mod.node_group = ng
    return mod


blade, peb, leaf = blade_mesh(), pebble_mesh(), leaf_mesh()
scatter(ground, blade, 2600 if A.mode == "still" else 1700, WATER_Z + 0.10, 3.0, (0.6, 1.5), 0.35, "grass", 1)
scatter(ground, peb, 45, WATER_Z - 0.10, WATER_Z + 0.22, (0.4, 2.4), 1.2, "pebbles", 2)
reed = blade_mesh()
reed.scale = (1.4, 1.4, 3.4)
scatter(ground, reed, 140, WATER_Z - 0.04, WATER_Z + 0.20, (0.7, 1.3), 0.25, "reeds", 4)

# ---------------------------------------------------------------- water
bpy.ops.mesh.primitive_grid_add(x_subdivisions=2, y_subdivisions=2, size=1, location=(0, 0, WATER_Z))
water = bpy.context.active_object
water.name = "water"
water.scale = (34, 9.0, 1)
bpy.ops.object.transform_apply(scale=True)  # scatter works in object space: apply, or instances stretch
wm = bpy.data.materials.new("water")
wm.use_nodes = True
nt = wm.node_tree
N, L = nt.nodes, nt.links
wb = principled(wm)
tint = {"clear": (0.05, 0.07, 0.06), "stagnant-water": (0.06, 0.07, 0.03), "mosquitoes": (0.05, 0.06, 0.03),
        "algal-scum": (0.05, 0.10, 0.02), "foam": (0.06, 0.07, 0.06), "litter": (0.06, 0.07, 0.06),
        "oil-sheen": (0.03, 0.035, 0.035), "sewage": (0.13, 0.12, 0.10), "dead-fish": (0.06, 0.07, 0.05)}[V]
inp(wb, "Base Color").default_value = (*tint, 1)
inp(wb, "Roughness").default_value = 0.02 if CALM else 0.05
inp(wb, "IOR").default_value = 1.333
inp(wb, "Specular IOR Level", "Specular").default_value = 0.6
tc = N.new("ShaderNodeTexCoord")
mp = N.new("ShaderNodeMapping")
L.new(tc.outputs["Object"], mp.inputs["Vector"])
mp.inputs["Scale"].default_value = (1.0, 1.0, 1.0) if CALM else (0.45, 1.6, 1.0)
r1 = N.new("ShaderNodeTexNoise")
r1.inputs["Scale"].default_value = 18 if CALM else 9
r1.inputs["Detail"].default_value = 8
r1.inputs["Roughness"].default_value = 0.65
L.new(mp.outputs["Vector"], r1.inputs["Vector"])
wbump = N.new("ShaderNodeBump")
wbump.inputs["Strength"].default_value = 0.05 if CALM else 0.3
wbump.inputs["Distance"].default_value = 0.01
L.new(r1.outputs["Fac"], wbump.inputs["Height"])
L.new(wbump.outputs["Normal"], inp(wb, "Normal"))
if A.mode == "clip" and not CALM:  # flow: slide the ripples downstream
    loc = mp.inputs["Location"]
    loc.default_value[0] = 0.0
    loc.keyframe_insert("default_value", index=0, frame=1)
    loc.default_value[0] = -0.035 * A.frames
    loc.keyframe_insert("default_value", index=0, frame=A.frames)
out = next(n for n in N if n.type == "OUTPUT_MATERIAL")
if V in ("algal-scum", "foam", "stagnant-water", "mosquitoes", "sewage"):
    pat = N.new("ShaderNodeTexNoise")
    pat.inputs["Scale"].default_value = {"algal-scum": 1.3, "foam": 2.6, "stagnant-water": 1.8, "mosquitoes": 1.8, "sewage": 0.8}[V]
    pat.inputs["Detail"].default_value = 12
    pat.inputs["Roughness"].default_value = 0.7
    pm = N.new("ShaderNodeMapping")
    pm.inputs["Scale"].default_value = (0.35, 1.8, 1) if V == "foam" else (1, 1, 1)  # foam streaks along the flow
    L.new(tc.outputs["Object"], pm.inputs["Vector"])
    L.new(pm.outputs["Vector"], pat.inputs["Vector"])
    cr = N.new("ShaderNodeValToRGB")
    lo, hi = {"algal-scum": (0.47, 0.56), "foam": (0.60, 0.66), "stagnant-water": (0.50, 0.58), "mosquitoes": (0.52, 0.60), "sewage": (0.40, 0.62)}[V]
    cr.color_ramp.elements[0].position, cr.color_ramp.elements[1].position = lo, hi
    L.new(pat.outputs["Fac"], cr.inputs["Fac"])
    skin = N.new("ShaderNodeBsdfPrincipled")
    col = {"algal-scum": (0.10, 0.24, 0.02), "foam": (0.80, 0.79, 0.72), "stagnant-water": (0.08, 0.20, 0.03),
           "mosquitoes": (0.07, 0.18, 0.03), "sewage": (0.24, 0.22, 0.18)}[V]
    fine = N.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = 140 if V in ("stagnant-water", "mosquitoes") else 60
    fine.inputs["Detail"].default_value = 6
    tintmix = N.new("ShaderNodeMixRGB")
    tintmix.blend_type = "MULTIPLY"
    tintmix.inputs["Fac"].default_value = 0.5
    tintmix.inputs[1].default_value = (*col, 1)
    L.new(fine.outputs["Color"], tintmix.inputs[2])
    L.new(tintmix.outputs["Color"], inp(skin, "Base Color"))
    inp(skin, "Roughness").default_value = 0.6 if V != "sewage" else 0.15
    sbump = N.new("ShaderNodeBump")
    sbump.inputs["Strength"].default_value = 0.25
    L.new(fine.outputs["Fac"], sbump.inputs["Height"])
    L.new(sbump.outputs["Normal"], inp(skin, "Normal"))
    mix = N.new("ShaderNodeMixShader")
    L.new(cr.outputs["Color"], mix.inputs["Fac"])
    L.new(wb.outputs["BSDF"], mix.inputs[1])
    L.new(skin.outputs["BSDF"], mix.inputs[2])
    L.new(mix.outputs["Shader"], out.inputs["Surface"])
if V == "oil-sheen":
    th = N.new("ShaderNodeTexNoise")
    th.inputs["Scale"].default_value = 1.4
    th.inputs["Detail"].default_value = 4
    tm = N.new("ShaderNodeMapRange")
    tm.inputs["From Min"].default_value, tm.inputs["From Max"].default_value = 0.40, 0.68
    tm.inputs["To Min"].default_value, tm.inputs["To Max"].default_value = 0.0, 1000.0
    L.new(th.outputs["Fac"], tm.inputs["Value"])
    L.new(tm.outputs["Result"], inp(wb, "Thin Film Thickness"))
    inp(wb, "Thin Film IOR").default_value = 1.45
water.data.materials.append(wm)
scatter(water, leaf, 0.9 if V != "clear" else 0.4, -1, 1, (0.5, 1.2), 0.15, "leaves", 3)

# ---------------------------------------------------------------- the sign itself
def floating(o, x, y, sink=0.0):
    o.location = (x, y, WATER_Z - sink)
    o.rotation_euler = (rng.uniform(-0.35, 0.35), rng.uniform(-0.35, 0.35), rng.uniform(0, 6.3))


if V == "litter":
    cols = [(0.75, 0.08, 0.05), (0.05, 0.22, 0.7), (0.85, 0.85, 0.8), (0.9, 0.68, 0.05), (0.08, 0.45, 0.12)]
    for i in range(11):
        kind = rng.choice(("bottle", "bottle", "can", "bag", "cup"))
        x, y = rng.uniform(-0.8, 2.6), rng.uniform(-1.2, 1.0)
        if kind == "bottle":
            bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=0.23, vertices=32)
            o = bpy.context.active_object
            o.data.materials.append(material(f"pet{i}", (0.7, 0.82, 0.82), rough=0.06, transm=0.9))
        elif kind == "can":
            bpy.ops.mesh.primitive_cylinder_add(radius=0.033, depth=0.12, vertices=32)
            o = bpy.context.active_object
            o.data.materials.append(material(f"can{i}", rng.choice(cols), rough=0.25, metal=0.85))
        elif kind == "cup":
            bpy.ops.mesh.primitive_cone_add(radius1=0.04, radius2=0.03, depth=0.1, vertices=32)
            o = bpy.context.active_object
            o.data.materials.append(material(f"cup{i}", (0.9, 0.9, 0.88), rough=0.4))
        else:
            bpy.ops.mesh.primitive_grid_add(x_subdivisions=24, y_subdivisions=24, size=0.38)
            o = bpy.context.active_object
            for v in o.data.vertices:
                v.co.z += 0.05 * noise.noise(v.co * 9 + Vector((i, 0, 0)))
            o.data.materials.append(material(f"bag{i}", rng.choice(cols), rough=0.3, transm=0.25))
        bpy.ops.object.shade_smooth()
        floating(o, x, y, sink=0.01)
        if kind in ("bottle", "can"):
            o.rotation_euler[0] = math.pi / 2 + rng.uniform(-0.25, 0.25)
if V == "dead-fish":
    for i in range(2):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, segments=48, ring_count=24)
        f = bpy.context.active_object
        for v in f.data.vertices:  # spindle body, flat sides
            v.co.x *= 2.8 * (1 - 0.25 * max(0, -v.co.x / 0.1))
            v.co.y *= 0.45
            v.co.z *= 0.8
        bpy.ops.object.shade_smooth()
        f.data.materials.append(material("fish", (0.70, 0.72, 0.70), rough=0.18, metal=0.45))
        bpy.ops.mesh.primitive_plane_add(size=0.16)
        t = bpy.context.active_object
        t.location = (-0.33, 0, 0)
        t.rotation_euler = (math.pi / 2, 0, 0)
        t.data.materials.append(material("fin", (0.45, 0.45, 0.42), rough=0.4))
        bpy.ops.object.select_all(action="DESELECT")
        f.select_set(True)
        t.select_set(True)
        bpy.context.view_layer.objects.active = f
        bpy.ops.object.join()
        floating(f, rng.uniform(0.4, 1.6), rng.uniform(-1.4, -1.0) if i else rng.uniform(-0.7, -0.4), sink=0.035)
        f.rotation_euler[0] = math.pi / 2 + rng.uniform(-0.2, 0.2)  # on its side
if V == "sewage":
    bpy.ops.mesh.primitive_cylinder_add(radius=0.3, depth=1.4, vertices=64)
    pipe = bpy.context.active_object
    pipe.rotation_euler = (math.pi / 2, 0, 0)
    pipe.location = (1.3, CH + 0.25, WATER_Z + 0.32)
    pipe.data.materials.append(material("concrete", (0.38, 0.37, 0.34), rough=0.95))
    bpy.ops.mesh.primitive_cylinder_add(radius=0.24, depth=1.42, vertices=64, location=pipe.location, rotation=pipe.rotation_euler)
    bpy.context.active_object.data.materials.append(material("dark", (0.015, 0.015, 0.015), rough=1.0))
if V == "mosquitoes":
    mm = material("mosq", (0.02, 0.02, 0.02), rough=0.8)
    for i in range(320):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=rng.uniform(0.0035, 0.006), segments=6, ring_count=4,
                                             location=(2.4 + rng.gauss(0, 0.6), 0.4 + rng.gauss(0, 0.5), WATER_Z + 1.25 + rng.gauss(0, 0.28)))
        o = bpy.context.active_object
        o.scale = (1.8, 0.7, 0.7)
        o.data.materials.append(mm)

# ---------------------------------------------------------------- light
world = bpy.data.worlds.new("sky")
scene.world = world
world.use_nodes = True
wt = world.node_tree
bg = next(n for n in wt.nodes if n.type == "BACKGROUND")
sky = wt.nodes.new("ShaderNodeTexSky")
types = [i.identifier for i in sky.bl_rna.properties["sky_type"].enum_items]
sky.sky_type = next((t for t in ("MULTIPLE_SCATTERING", "NISHITA", "SINGLE_SCATTERING", "HOSEK_WILKIE") if t in types), types[0])
elev = 11.0 if DUSK else rng.uniform(28, 55)
rot = rng.uniform(-0.6, 0.6) - math.pi / 2  # sun behind the photographer: no glint in frame
if hasattr(sky, "sun_elevation"):
    sky.sun_elevation, sky.sun_rotation = math.radians(elev), rot
if hasattr(sky, "sun_disc"):
    sky.sun_disc = False
wt.links.new(sky.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = A.sky_strength * (0.8 if DUSK else 1.0)
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.active_object
sun.data.energy = 2.2 if DUSK else rng.uniform(2.6, 4.2)
sun.data.color = (1.0, 0.68, 0.45) if DUSK else (1.0, 0.96, 0.9)
sun.data.angle = math.radians(rng.uniform(1.0, 4.0))
sun.rotation_euler = (math.radians(90 - elev), 0, rot)

# ---------------------------------------------------------------- the phone: from the near bank, looking down at the water
bpy.ops.object.camera_add()
cam = bpy.context.active_object
scene.camera = cam
cam.data.sensor_width = 36
cam.data.lens = 26
bank_y = -(CH + 1.2)
cam.location = (rng.uniform(-0.4, 0.4), bank_y, ground_z(0, bank_y) + 1.35)
target = Vector((rng.uniform(1.4, 2.2), rng.uniform(-1.3, -0.6), WATER_Z))
cam.data.lens = 26
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
cam.rotation_euler[1] += math.radians(rng.uniform(-2.0, 2.0))
cam.data.dof.use_dof = True
cam.data.dof.focus_distance = (target - cam.location).length
cam.data.dof.aperture_fstop = 4.0
if A.mode == "clip":
    scene.frame_start, scene.frame_end = 1, A.frames
    cam.keyframe_insert("location", frame=1)
    cam.keyframe_insert("rotation_euler", frame=1)
    cam.location.x += 0.22
    cam.rotation_euler[2] += math.radians(4)
    cam.keyframe_insert("location", frame=A.frames)
    cam.keyframe_insert("rotation_euler", frame=A.frames)
    act = cam.animation_data.action
    curves = list(act.fcurves) if hasattr(act, "fcurves") else [c for layer in act.layers for strip in layer.strips for bag in strip.channelbags for c in bag.fcurves]
    for fcu in curves:
        m = fcu.modifiers.new("NOISE")
        m.scale = 14
        m.strength = 0.008 if fcu.data_path == "rotation_euler" else 0.006
        m.phase = rng.uniform(0, 100)

if A.mode == "still":
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = A.out
    bpy.ops.render.render(write_still=True)
else:
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = A.out.rstrip("/\\") + "/f_"
    bpy.ops.render.render(animation=True)
print("done", V, A.mode, A.out)
