"""Render the cable pictures the remote view draws behind the device.

Run with Blender's Python module (`pip install bpy`), not with f1emu itself:

    python tools/render_cables.py

Each cable is modelled in millimetres, lying flat and seen from where the
camera of Flipper's front photo stands. It is rendered already turned to the
direction it leaves the device in, so the light falls on it from the same side
as on the device. Output: sim/cables/*.png and sim/cables/cables.json, which
says how big to draw each picture and where in it the plug's tip is.
"""
import json
import math
from pathlib import Path

import bpy

OUT = Path(__file__).resolve().parent.parent / "sim" / "cables"
PX_PER_MM = 1690 / 155          # device.png: the body is 1690 px wide, the device 155 mm
# The sockets sit well behind the front face the photo is focused on, and the
# photo has perspective, so a plug drawn at the front face's scale looks oversized.
DISPLAY_SCALE = 0.8
RENDER_SCALE = 2.0              # rendered finer than shown, for sharp edges
LENGTH = 190                    # mm of cable, enough to run off any window
MARGIN = 14                     # mm around the cable


def material(name, color, roughness, metallic=0.0, grain=0.0, clear=False, braid=None):
    """A plastic, rubber or metal. `grain` is the fine surface texture of moulded
    parts; `braid` (strands, pitch in turns over the cable) weaves a sleeve."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = nodes["Principled BSDF"]
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    if clear:
        shader.inputs["Transmission Weight"].default_value = 0.9
        shader.inputs["IOR"].default_value = 1.55
    height = None
    if grain:
        coords = nodes.new("ShaderNodeTexCoord")
        noise = nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 9.0
        noise.inputs["Detail"].default_value = 6.0
        links.new(coords.outputs["Object"], noise.inputs["Vector"])
        height, strength = noise.outputs["Fac"], grain
        # Moulded surfaces are not evenly matte either.
        vary = nodes.new("ShaderNodeMapRange")
        vary.inputs["To Min"].default_value = roughness - 0.07
        vary.inputs["To Max"].default_value = roughness + 0.09
        links.new(noise.outputs["Fac"], vary.inputs["Value"])
        links.new(vary.outputs["Result"], shader.inputs["Roughness"])
    if braid:
        strands, turns = braid
        uv = nodes.new("ShaderNodeSeparateXYZ")
        links.new(nodes.new("ShaderNodeTexCoord").outputs["UV"], uv.inputs["Vector"])

        def math_node(op, a, b):
            n = nodes.new("ShaderNodeMath")
            n.operation = op
            for socket, value in zip(n.inputs, (a, b)):
                if isinstance(value, (int, float)):
                    socket.default_value = value
                else:
                    links.new(value, socket)
            return n.outputs["Value"]

        along = math_node("MULTIPLY", uv.outputs["X"], turns * math.tau)
        around = math_node("MULTIPLY", uv.outputs["Y"], strands * math.tau)
        # Two families of strands winding opposite ways, crossing each other.
        weave = math_node("MULTIPLY", math_node("SINE", math_node("ADD", along, around), 0),
                          math_node("SINE", math_node("SUBTRACT", along, around), 0))
        height, strength = weave, 0.55
        shade = nodes.new("ShaderNodeMixRGB")
        shade.blend_type = "MULTIPLY"
        shade.inputs["Fac"].default_value = 0.35
        shade.inputs["Color1"].default_value = (*color, 1)
        ramp = nodes.new("ShaderNodeMapRange")
        ramp.inputs["From Min"].default_value = -1
        ramp.inputs["To Min"].default_value = 0.35
        links.new(weave, ramp.inputs["Value"])
        links.new(ramp.outputs["Result"], shade.inputs["Color2"])
        links.new(shade.outputs["Color"], shader.inputs["Base Color"])
    if height:
        bump = nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = strength
        bump.inputs["Distance"].default_value = 0.12
        links.new(height, bump.inputs["Height"])
        links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    return mat


def finish(obj, mat, parent, bevel=0.0):
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if bevel:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 8
        mod.limit_method = "ANGLE"
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


def box(parent, mat, x0, x1, width, thick, bevel, z=0.0, y=0.0):
    """A block from x0 to x1 along the cable, `width` across, `thick` towards the camera."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, y, z))
    obj = bpy.context.object
    obj.scale = (x1 - x0, width, thick)
    return finish(obj, mat, parent, bevel)


def tube(parent, mat, x0, x1, r0, r1=None, bevel=0.0):
    """A round section from x0 to x1, tapering from radius r0 to r1."""
    bpy.ops.mesh.primitive_cone_add(vertices=96, radius1=r0, radius2=r0 if r1 is None else r1, depth=x1 - x0,
                                    location=((x0 + x1) / 2, 0, 0), rotation=(0, math.pi / 2, 0))
    return finish(bpy.context.object, mat, parent, bevel)


def strain_relief(parent, mat, x0, x1, r0, r1, ribs):
    """The ribbed sleeve where the cable leaves the plug."""
    tube(parent, mat, x0, x1, r0 * 0.84, r1 * 0.9)
    step = (x1 - x0) / ribs
    for i in range(ribs):
        r = r0 + (r1 - r0) * i / (ribs - 1)
        tube(parent, mat, x0 + i * step, x0 + i * step + step * 0.56, r, bevel=step * 0.17)
    return x1


def lead(parent, mat, x0, radius, droop):
    """The cable itself: straight out of the sleeve, then sagging a little, as a
    real one does. A dead-straight cable is what makes a drawing look drawn."""
    data = bpy.data.curves.new("lead", "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = radius
    data.bevel_resolution = 10
    data.resolution_u = 48
    data.use_fill_caps = True
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(1)
    start, end = spline.bezier_points
    start.co, start.handle_left, start.handle_right = (x0, 0, 0), (x0 - 20, 0, 0), (x0 + 60, 0, 0)
    end.co = (LENGTH, droop, 0)
    end.handle_left, end.handle_right = (LENGTH - 60, droop * 0.55, 0), (LENGTH + 20, droop * 1.2, 0)
    for point in (start, end):
        point.handle_left_type = point.handle_right_type = "FREE"
    obj = bpy.data.objects.new("lead", data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


def usb_c(parent, mats, droop):
    """A braided USB-C cable in Flipper orange, like the one in Flipper's own photos."""
    box(parent, mats["metal"], 0, 7.2, 8.34, 2.56, 1.1)
    box(parent, mats["orange"], 6.6, 8.2, 9.0, 5.0, 1.6)
    box(parent, mats["orange"], 7.6, 24, 9.8, 5.6, 2.2)
    box(parent, mats["orange-gloss"], 11.5, 20, 5.4, 0.5, 0.2, z=2.72)
    tube(parent, mats["orange"], 23.4, 25.2, 3.1, 2.5, bevel=0.3)
    end = strain_relief(parent, mats["orange"], 25, 36, 2.5, 2.0, 8)
    lead(parent, mats["orange-braid"], end - 1, 1.65, droop)
    return 6.6


def rj45(color):
    def build(parent, mats, droop):
        box(parent, mats["clear"], 0, 21.5, 11.7, 8.0, 0.5)
        # The eight wires and their gold contacts, seen through the clear plug.
        for i, wire in enumerate(("wire-orange", "wire-white", "wire-green", "wire-white",
                                  "wire-blue", "wire-white", "wire-brown", "wire-white")):
            y = (i - 3.5) * 1.02
            box(parent, mats[wire], 7.5, 21, 0.72, 0.72, 0.3, z=1.6, y=y)
            box(parent, mats["gold"], 1.0, 7.0, 0.5, 2.4, 0.1, z=2.6, y=y)
        box(parent, mats[color], 18, 31, 12.4, 9.6, 2.4)
        for x in (21.5, 24.0, 26.5):
            box(parent, mats[color], x, x + 1.1, 9.4, 0.7, 0.3, z=4.75)
        tube(parent, mats[color], 30, 35.5, 4.6, 3.5, bevel=0.6)
        end = strain_relief(parent, mats[color], 35.5, 48, 3.5, 2.95, 8)
        lead(parent, mats[color + "-jacket"], end - 1, 2.6, droop)
        return 14.5
    return build


def hdmi(parent, mats, droop):
    box(parent, mats["metal"], 0, 11.5, 13.9, 4.45, 1.0)
    box(parent, mats["black"], 11, 37, 19.4, 10.0, 2.8)
    box(parent, mats["black-gloss"], 16, 31, 11.0, 0.5, 0.25, z=4.9)
    box(parent, mats["black"], 35.5, 46, 14.6, 9.2, 3.2)
    end = strain_relief(parent, mats["black"], 46, 61, 4.6, 3.8, 9)
    lead(parent, mats["black-jacket"], end - 1, 3.4, droop)
    return 11.0


# name: (how to build it, direction it leaves in as degrees on the page: 0 is
# right, -90 is up; how far its far end sags, in mm, positive is down the page)
CABLES = {
    "usb-c": (usb_c, 0.0, 26),
    "hdmi": (hdmi, -90.0, 0),
    # Perpendicular to the slanted upper-left face the Ethernet sockets are in.
    "eth-grey": (rj45("grey"), 216.2, 22),
    "eth-black": (rj45("black"), 216.2, 16),
}


def scene_setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 160
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"
    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.5, 0.52, 0.56, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.28
    scene.world = world
    # The device photo is lit softly from above and a little from the left; a
    # weak light from the other side keeps the shadowed edge off pure black.
    for direction, strength, angle in (((-0.35, 0.75, 1.0), 2.3, 45), ((0.7, -0.5, 0.8), 0.5, 70)):
        bpy.ops.object.light_add(type="SUN")
        sun = bpy.context.object
        sun.data.energy = strength
        sun.data.angle = math.radians(angle)
        x, y, z = direction
        sun.rotation_euler = (math.atan2(math.hypot(x, y), z), 0, math.atan2(x, -y))
    bpy.ops.object.camera_add(location=(0, 0, 300))
    scene.camera = bpy.context.object
    scene.camera.data.type = "ORTHO"
    scene.camera.data.clip_end = 1000
    return scene


def materials():
    orange = (0.82, 0.19, 0.008)        # the device's buttons, #FF8200 in linear light
    return {
        "black": material("black", (0.02, 0.02, 0.023), 0.5, grain=0.25),
        "black-gloss": material("black-gloss", (0.015, 0.015, 0.018), 0.2),
        "black-jacket": material("black-jacket", (0.022, 0.022, 0.025), 0.42, grain=0.1),
        "grey": material("grey", (0.2, 0.21, 0.225), 0.5, grain=0.25),
        "grey-jacket": material("grey-jacket", (0.2, 0.21, 0.225), 0.42, grain=0.1),
        "orange": material("orange", orange, 0.48, grain=0.22),
        "orange-gloss": material("orange-gloss", orange, 0.18),
        "orange-braid": material("orange-braid", orange, 0.6, braid=(9, 150)),
        "metal": material("metal", (0.78, 0.78, 0.8), 0.24, metallic=1.0),
        "gold": material("gold", (0.9, 0.62, 0.2), 0.25, metallic=1.0),
        "clear": material("clear", (0.9, 0.93, 0.95), 0.08, clear=True),
        "wire-orange": material("wire-orange", (0.8, 0.25, 0.02), 0.4),
        "wire-white": material("wire-white", (0.75, 0.75, 0.72), 0.4),
        "wire-green": material("wire-green", (0.03, 0.4, 0.08), 0.4),
        "wire-blue": material("wire-blue", (0.03, 0.12, 0.6), 0.4),
        "wire-brown": material("wire-brown", (0.2, 0.08, 0.03), 0.4),
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.png"):
        old.unlink()
    placement = {}
    for name, (build, degrees, sag) in CABLES.items():
        scene = scene_setup()
        bpy.ops.object.empty_add()
        cable = bpy.context.object
        # The page's y axis points down, Blender's up: turn the other way.
        turn = -math.radians(degrees)
        # Which way along the cable's own sideways axis is "down the page".
        droop = -sag if math.cos(turn) > 0 else sag
        hidden = build(cable, materials(), droop)
        # The device's body, standing in for itself: unseen, but it shades the
        # part of the plug next to the socket, as the real body would.
        bpy.ops.mesh.primitive_cube_add(size=1, location=(hidden - 40, 0, 26))
        body = bpy.context.object
        body.scale = (80, 90, 40)
        body.visible_camera = False
        body.parent = cable
        cable.rotation_euler = (0, 0, turn)

        def turned(x, y):
            return (x * math.cos(turn) - y * math.sin(turn), x * math.sin(turn) + y * math.cos(turn))

        corners = [(0, 0), turned(LENGTH, 0), turned(LENGTH, droop)]
        left = min(c[0] for c in corners) - MARGIN
        right = max(c[0] for c in corners) + MARGIN
        bottom = min(c[1] for c in corners) - MARGIN
        top = max(c[1] for c in corners) + MARGIN
        width, height = right - left, top - bottom
        pixels = PX_PER_MM * DISPLAY_SCALE * RENDER_SCALE
        scene.render.resolution_x = round(width * pixels)
        scene.render.resolution_y = round(height * pixels)
        scene.camera.location = ((left + right) / 2, (bottom + top) / 2, 300)
        scene.camera.data.ortho_scale = max(width, height)
        scene.render.filepath = str(OUT / f"{name}.png")
        bpy.ops.render.render(write_still=True)
        # In pixels of device.png: the picture's size, where the plug's tip is in
        # it, and how much of the plug disappears into the socket.
        shown = PX_PER_MM * DISPLAY_SCALE
        placement[name] = {
            "width": round(width * shown, 1), "height": round(height * shown, 1),
            "tip_x": round(-left * shown, 1), "tip_y": round(top * shown, 1),
            "hidden": round(hidden * shown, 1), "degrees": degrees,
        }
    (OUT / "cables.json").write_text(json.dumps(placement, indent=1) + "\n")


if __name__ == "__main__":
    main()
