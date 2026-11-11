"""Photoreal product renders of the four devices, for compositing the app recordings into.

    blender -b --factory-startup -P video/blender/devices.py -- --dev phone|tablet|duo|display --pass frame|glass
            --out video/remotion/public/mock [--samples 128] [--scale 1.0]

For each device two transparent PNGs are rendered from the same camera:
  <dev>-frame.png  the device with its screen cut out (alpha 0) and a soft shadow on a hidden backdrop
  <dev>-glass.png  only the reflections on the screen glass (everything else is a holdout); drawn over the footage with 'screen'
and <dev>.json holds the four screen corners in image pixels, so the recording can be warped exactly onto the screen.
Generic devices (no brand details), real proportions, metal and glass materials, softbox lighting.
"""

import json
import math
import os
import sys

import bmesh
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Euler, Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


DEV = arg("--dev", "phone")
PASS = arg("--pass", "frame")
OUT = arg("--out", ".")
SAMPLES = int(arg("--samples", "128"))
SCALE = float(arg("--scale", "1.0"))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


# ---------------------------------------------------------------- materials
def principled(mat):
    mat.use_nodes = True
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def metal(name, color, rough, brushed=0.02):
    m = bpy.data.materials.new(name)
    b = principled(m)
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = 1.0
    b.inputs["Roughness"].default_value = rough
    nt = m.node_tree
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1500, 40, 1500)  # fine lines along one axis: brushed metal
    ns = nt.nodes.new("ShaderNodeTexNoise")
    ns.inputs["Scale"].default_value = 1.0
    ns.inputs["Detail"].default_value = 6
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = brushed
    bump.inputs["Distance"].default_value = 0.0002
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], ns.inputs["Vector"])
    nt.links.new(ns.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


def glossy_black(name, rough=0.04):
    m = bpy.data.materials.new(name)
    b = principled(m)
    b.inputs["Base Color"].default_value = (0.004, 0.004, 0.005, 1)
    b.inputs["Metallic"].default_value = 0.0
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = 0.6
    return m


def matte(name, color, rough=0.6):
    m = bpy.data.materials.new(name)
    b = principled(m)
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    return m


GRAPHITE = metal("graphite", (0.085, 0.087, 0.092), 0.30)
SILVER = metal("silver", (0.80, 0.81, 0.83), 0.26)
BLACK_GLASS = glossy_black("glass")
SCREEN_GLASS = glossy_black("screen-glass", rough=0.025)
BLACK_MATTE = matte("black", (0.006, 0.006, 0.007), 0.5)


# ---------------------------------------------------------------- geometry
def rrect(w, h, r, seg=14):
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def slab(name, w, h, d, r, x=0.0, y=0.0, z0=0.0, mat=None, bevel=0.0005, seg=14):
    """A rounded-corner plate, face up, with softly bevelled edges."""
    bm = bmesh.new()
    face = bm.faces.new([bm.verts.new((px + x, py + y, z0)) for px, py in rrect(w, h, r, seg)])
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    bmesh.ops.translate(bm, verts=[v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)], vec=(0, 0, d))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(35):
            e.smooth = False
    for f in bm.faces:
        f.smooth = True
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new(name, me))
    if bevel:
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width = bevel
        bv.segments = 4
        bv.limit_method = "ANGLE"
        bv.angle_limit = math.radians(35)
    if mat:
        ob.data.materials.append(mat)
    return ob


def plane(name, w, h, r, z, x=0.0, y=0.0, mat=None):
    bm = bmesh.new()
    bm.faces.new([bm.verts.new((px + x, py + y, z)) for px, py in rrect(w, h, r, 12)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new(name, me))
    if mat:
        ob.data.materials.append(mat)
    return ob


def box(name, cx, cy, cz, sx, sy, sz, mat, bevel=0.002):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(cx, cy, cz), verts=bm.verts)
    for f in bm.faces:
        f.smooth = True
    for e in bm.edges:
        e.smooth = False
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new(name, me))
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments = bevel, 4
    ob.data.materials.append(mat)
    return ob


def cylinder_y(name, x, z, radius, length, mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=radius, depth=length, location=(x, 0, z), rotation=(math.radians(90), 0, 0))
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return ob


# ---------------------------------------------------------------- the four devices (metres; face up, +Y = up, +X = right)
def build_phone():
    sw, sh = 0.0650, 0.1407  # screen: 390 x 844
    W, H, D = sw + 0.0066, sh + 0.0066, 0.0082
    parts = [slab("frame", W, H, D, 0.0098, mat=GRAPHITE, bevel=0.0006)]
    parts.append(slab("glass", W - 0.0012, H - 0.0012, 0.0006, 0.0092, z0=D - 0.0002, mat=BLACK_GLASS, bevel=0.0002))
    top = D + 0.0004
    screen = plane("screen", sw, sh, 0.0082, top + 0.0001, mat=SCREEN_GLASS)
    parts.append(slab("island", 0.0190, 0.0058, 0.0001, 0.0029, y=sh / 2 - 0.0082, z0=top + 0.0001, mat=BLACK_MATTE, bevel=0))
    for name, y, ln in (("action", 0.040, 0.0072), ("volup", 0.027, 0.0130), ("voldown", 0.009, 0.0130)):
        parts.append(box(name, -W / 2 - 0.0002, y, D / 2, 0.0018, ln, 0.0030, GRAPHITE, 0.0006))
    parts.append(box("power", W / 2 + 0.0002, 0.026, D / 2, 0.0018, 0.0190, 0.0030, GRAPHITE, 0.0006))
    return dict(parts=parts, screens=[screen], quad=(sw, sh, top + 0.0001), wall=0.050)


def build_tablet():
    sw, sh = 0.1740, 0.2504  # screen: 820 x 1180
    W, H, D = sw + 0.0170, sh + 0.0170, 0.0058
    parts = [slab("frame", W, H, D, 0.0125, mat=SILVER, bevel=0.0005)]
    parts.append(slab("glass", W - 0.0014, H - 0.0014, 0.0006, 0.0118, z0=D - 0.0002, mat=BLACK_GLASS, bevel=0.0002))
    top = D + 0.0004
    screen = plane("screen", sw, sh, 0.0045, top + 0.0001, mat=SCREEN_GLASS)
    parts.append(slab("camera", 0.0026, 0.0026, 0.0001, 0.0013, y=sh / 2 + 0.0043, z0=top + 0.0001, mat=BLACK_MATTE, bevel=0))
    parts.append(box("power", W * 0.30, H / 2 + 0.0002, D / 2, 0.016, 0.0018, 0.0028, SILVER, 0.0006))
    return dict(parts=parts, screens=[screen], quad=(sw, sh, top + 0.0001), wall=0.050)


def build_duo():
    s = 0.0002  # metres per CSS px
    pw, sh, gap = 540 * s, 705 * s, 34 * s  # two 108 mm screens, 6.8 mm hinge gap
    bez = 0.0035
    inner = gap / 2 - 0.0004
    bw, bh, D = bez + pw + inner, sh + 2 * bez, 0.0062
    parts, screens = [], []
    for side in (-1, 1):
        cx = side * (0.0004 + bw / 2)
        parts.append(slab(f"frame{side}", bw, bh, D, 0.0070, x=cx, mat=GRAPHITE, bevel=0.0005))
        parts.append(slab(f"glass{side}", bw - 0.0012, bh - 0.0012, 0.0006, 0.0064, x=cx, z0=D - 0.0002, mat=BLACK_GLASS, bevel=0.0002))
        sx = side * (gap / 2 + pw / 2)
        screens.append(plane(f"screen{side}", pw, sh, 0.0040, D + 0.0005, x=sx, mat=SCREEN_GLASS))
    parts.append(cylinder_y("hinge", 0, D / 2, 0.0036, bh + 0.0045, GRAPHITE))
    return dict(parts=parts, screens=screens, quad=(2 * pw + gap, sh, D + 0.0005), wall=0.040)


def build_display():
    sw, sh = 0.600, 0.375  # screen: 1440 x 900
    bez, D = 0.0095, 0.0090
    W, H = sw + 2 * bez, sh + 2 * bez
    parts = [slab("frame", W, H, D, 0.0060, mat=SILVER, bevel=0.0006)]
    parts.append(slab("glass", W - 0.0014, H - 0.0014, 0.0006, 0.0054, z0=D - 0.0002, mat=BLACK_GLASS, bevel=0.0002))
    top = D + 0.0004
    screen = plane("screen", sw, sh, 0.0030, top + 0.0001, mat=SCREEN_GLASS)
    parts.append(slab("camera", 0.0028, 0.0028, 0.0001, 0.0014, y=sh / 2 + 0.0048, z0=top + 0.0001, mat=BLACK_MATTE, bevel=0))
    # stand: a tapered neck behind the panel and a flat foot on the desk
    bm = bmesh.new()
    pts = [(-0.034, -H / 2 + 0.030), (0.034, -H / 2 + 0.030), (0.027, -0.372), (-0.027, -0.372)]
    face = bm.faces.new([bm.verts.new((x, y, -0.0130)) for x, y in pts])
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    bmesh.ops.translate(bm, verts=[v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)], vec=(0, 0, 0.0125))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        f.smooth = True
    for e in bm.edges:
        e.smooth = False
    me = bpy.data.meshes.new("neck")
    bm.to_mesh(me)
    bm.free()
    neck = link(bpy.data.objects.new("neck", me))
    bv = neck.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments = 0.0018, 4
    neck.data.materials.append(SILVER)
    parts.append(neck)
    parts.append(box("foot", 0, -0.3775, -0.045, 0.250, 0.0100, 0.190, SILVER, 0.0035))
    return dict(parts=parts, screens=[screen], quad=(sw, sh, top + 0.0001), wall=0.20, floor=True)


SPEC = {
    "phone": dict(build=build_phone, src=(390, 844), yaw=-14, pitch=4, res=(1500, 2100), fill=0.80, lens=120),
    "tablet": dict(build=build_tablet, src=(820, 1180), yaw=14, pitch=4, res=(1900, 2500), fill=0.82, lens=120),
    "duo": dict(build=build_duo, src=(1114, 705), yaw=-8, pitch=3, res=(3000, 2100), fill=0.88, lens=120),
    "display": dict(build=build_display, src=(1440, 900), yaw=-7, pitch=2, res=(3000, 2400), fill=0.88, lens=120),
}[DEV]

dev = SPEC["build"]()

# ---------------------------------------------------------------- stand the device up and turn it a little
root = bpy.data.objects.new("root", None)
link(root)
for ob in dev["parts"] + dev["screens"]:
    ob.parent = root
bpy.context.view_layer.update()
for ob in dev["parts"] + dev["screens"]:
    ob.matrix_parent_inverse = root.matrix_world.inverted()
root.rotation_euler = Euler((math.radians(90 + SPEC["pitch"]), 0, 0))
bpy.context.view_layer.update()
yaw = Matrix.Rotation(math.radians(SPEC["yaw"]), 4, "Z")
root.matrix_world = yaw @ root.matrix_world
bpy.context.view_layer.update()

# ---------------------------------------------------------------- shadow-catching backdrop
wall = bpy.data.objects.new("wall", bpy.data.meshes.new("wall"))
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=3.0)
bm.to_mesh(wall.data)
bm.free()
link(wall)
wall.rotation_euler = (math.radians(90), 0, 0)
wall.location = (0, dev["wall"], 0)
wall.is_shadow_catcher = True
extra = [wall]
if dev.get("floor"):
    zmin = min((root.matrix_world @ Vector(c)).z for ob in dev["parts"] for c in ob.bound_box)
    floor = bpy.data.objects.new("floor", bpy.data.meshes.new("floor"))
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=3.0)
    bm.to_mesh(floor.data)
    bm.free()
    link(floor)
    floor.location = (0, 0, zmin - 0.0002)
    floor.is_shadow_catcher = True
    extra.append(floor)

# ---------------------------------------------------------------- softbox lighting
def area(name, loc, size, power, target=(0, 0, 0), shape="RECTANGLE", sy=None):
    ld = bpy.data.lights.new(name, "AREA")
    ld.shape = shape
    ld.size = size
    if sy:
        ld.size_y = sy
    ld.energy = power
    ld.color = (1.0, 0.99, 0.97)
    ob = link(bpy.data.objects.new(name, ld))
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return ob


area("key", (-1.0, -1.4, 1.1), 1.4, 520, sy=1.0)
area("fill", (1.2, -1.2, 0.2), 1.6, 170, sy=1.6)
area("top", (0.1, -0.8, 1.5), 1.2, 160, sy=1.2)
area("rim-l", (-0.75, 0.55, 0.15), 0.16, 650, shape="RECTANGLE", sy=1.3)
area("rim-r", (0.8, 0.55, 0.10), 0.16, 650, shape="RECTANGLE", sy=1.3)
world = bpy.data.worlds.new("w")
scene.world = world
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = (0.70, 0.72, 0.76, 1)
bg.inputs["Strength"].default_value = 0.30

# ---------------------------------------------------------------- camera, auto-framed on the whole device
W_PX, H_PX = (int(v * SCALE) for v in SPEC["res"])
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = W_PX, H_PX, 100
cam_data = bpy.data.cameras.new("cam")
cam_data.lens, cam_data.sensor_width = SPEC["lens"], 36
cam = link(bpy.data.objects.new("cam", cam_data))
cam.rotation_euler = (math.radians(90), 0, 0)
scene.camera = cam


def world_points():
    for ob in dev["parts"]:
        for c in ob.bound_box:
            yield ob.matrix_world @ Vector(c)


dist = 1.6
cam.location = (0, -dist, 0)
for _ in range(5):
    bpy.context.view_layer.update()
    pts = [world_to_camera_view(scene, cam, p) for p in world_points()]
    x0, x1 = min(p.x for p in pts), max(p.x for p in pts)
    y0, y1 = min(p.y for p in pts), max(p.y for p in pts)
    vis = dist * 36 / SPEC["lens"]  # the longer image side, in metres at the subject
    vw, vh = (vis, vis * H_PX / W_PX) if W_PX >= H_PX else (vis * W_PX / H_PX, vis)
    cam.location.x += ((x0 + x1) / 2 - 0.5) * vw
    cam.location.z += ((y0 + y1) / 2 - 0.5) * vh
    dist *= max((x1 - x0), (y1 - y0)) / SPEC["fill"]
    cam.location.y = -dist
bpy.context.view_layer.update()

# ---------------------------------------------------------------- render settings
scene.render.engine = "CYCLES"
cy = scene.cycles
cy.samples = SAMPLES
cy.use_denoising = True
cy.denoiser = "OPENIMAGEDENOISE"
cy.max_bounces, cy.glossy_bounces, cy.transmission_bounces = 8, 6, 4
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "OPTIX"
prefs.get_devices()
for d in prefs.devices:
    d.use = d.type == "OPTIX"
cy.device = "GPU"
scene.render.film_transparent = True
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.color_depth = "8"

# ---------------------------------------------------------------- the two passes
if PASS == "frame":
    for s in dev["screens"]:
        s.is_holdout = True  # the screen is cut out: the recording shows through
else:
    for ob in dev["parts"] + extra:
        ob.is_holdout = True  # only the glass reflections remain
    for ob in extra:
        ob.hide_render = True

os.makedirs(OUT, exist_ok=True)
scene.render.filepath = os.path.join(OUT, f"{DEV}-{PASS}.png")
bpy.ops.render.render(write_still=True)

# four screen corners in image pixels (top-left, top-right, bottom-right, bottom-left)
qw, qh, qz = dev["quad"]
local = [Vector((-qw / 2, qh / 2, qz)), Vector((qw / 2, qh / 2, qz)), Vector((qw / 2, -qh / 2, qz)), Vector((-qw / 2, -qh / 2, qz))]
corners = []
for v in local:
    co = world_to_camera_view(scene, cam, root.matrix_world @ v)
    corners.append([round(co.x * W_PX, 2), round((1 - co.y) * H_PX, 2)])
with open(os.path.join(OUT, f"{DEV}.json"), "w") as f:
    json.dump({"w": W_PX, "h": H_PX, "src": list(SPEC["src"]), "corners": corners}, f)
print("DONE", DEV, PASS, W_PX, H_PX, corners)
