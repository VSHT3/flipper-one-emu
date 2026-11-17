"""Render the cable pictures the remote view draws behind the device.

Run with Blender's Python module (`pip install bpy`), not with f1emu itself:

    python tools/render_cables.py

Each cable is modelled from the connector's standard dimensions, in millimetres,
lying flat and seen from where the camera of Flipper's front photo stands. It is
rendered already turned to the direction it leaves the device in, so the light
falls on it from the same side as on the device. Output: sim/cables/*.png and
sim/cables/cables.json, which says where in each picture the plug's tip is.
"""
import json
import math
from pathlib import Path

import bpy

OUT = Path(__file__).resolve().parent.parent / "sim" / "cables"
PX_PER_MM = 1690 / 155          # device.png: the body is 1690 px wide, the device 155 mm
RENDER_SCALE = 1.5              # rendered finer than shown, for sharp edges
LENGTH = 175                    # mm of cable, enough to run off any window
MARGIN = 14                     # mm around the cable


def material(name, color, roughness, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes["Principled BSDF"]
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
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


def box(parent, mat, x0, x1, width, thick, bevel):
    """A block from x0 to x1 along the cable, `width` across, `thick` towards the camera."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, 0, 0))
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
    tube(parent, mat, x0, x1, r0 * 0.86, r1 * 0.9)
    step = (x1 - x0) / ribs
    for i in range(ribs):
        r = r0 + (r1 - r0) * i / (ribs - 1)
        tube(parent, mat, x0 + i * step, x0 + i * step + step * 0.58, r, bevel=step * 0.16)
    return x1


def usb_c(parent, mats):
    box(parent, mats["metal"], 0, 7, 8.34, 2.56, 1.1)
    box(parent, mats["black"], 6.6, 23, 10.6, 6.2, 2.3)
    end = strain_relief(parent, mats["black"], 22.5, 35, 2.9, 2.2, 7)
    tube(parent, mats["black"], end - 0.5, LENGTH, 1.9)


def rj45(color):
    def build(parent, mats):
        box(parent, mats["clear"], 0, 21.5, 11.7, 8.0, 0.5)
        box(parent, mats[color], 14, 30, 12.3, 9.6, 2.5)
        tube(parent, mats[color], 29, 35, 4.6, 3.6, bevel=0.6)
        end = strain_relief(parent, mats[color], 35, 48, 3.6, 3.0, 7)
        tube(parent, mats[color], end - 0.5, LENGTH, 2.6)
    return build


def hdmi(parent, mats):
    box(parent, mats["metal"], 0, 11.5, 13.9, 4.45, 1.0)
    box(parent, mats["black"], 11, 38, 19.6, 10.2, 2.8)
    box(parent, mats["black"], 38, 48, 15.0, 9.4, 3.2)
    end = strain_relief(parent, mats["black"], 48, 64, 4.7, 3.9, 8)
    tube(parent, mats["black"], end - 0.5, LENGTH, 3.5)


# name: (how to build it, direction it leaves in, as degrees on the page: 0 is right, -90 is up)
CABLES = {
    "usb-c": (usb_c, 0.0),
    "hdmi": (hdmi, -90.0),
    # Perpendicular to the slanted upper-left face the Ethernet sockets are in.
    "eth-grey": (rj45("grey"), 216.2),
    "eth-orange": (rj45("orange"), 216.2),
}


def scene_setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"
    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.55, 0.57, 0.6, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35
    scene.world = world
    # The device photo is lit softly from above and a little from the left.
    for direction, strength, angle in (((-0.35, 0.75, 1.0), 2.4, 50), ((0.6, -0.4, 1.0), 0.45, 80)):
        bpy.ops.object.light_add(type="SUN")
        sun = bpy.context.object
        sun.data.energy = strength
        sun.data.angle = math.radians(angle)
        x, y, z = direction
        sun.rotation_euler = (math.atan2(math.hypot(x, y), z), 0, math.atan2(x, -y))
    bpy.ops.object.camera_add(location=(0, 0, 200))
    scene.camera = bpy.context.object
    scene.camera.data.type = "ORTHO"
    scene.camera.data.clip_end = 1000
    return scene


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    placement = {}
    for name, (build, degrees) in CABLES.items():
        scene = scene_setup()
        mats = {
            # Colours taken from the device itself: its charcoal body, its light
            # grey print and its orange buttons, so the cables read as part of the set.
            "black": material("black", (0.022, 0.022, 0.025), 0.45),
            "metal": material("metal", (0.78, 0.78, 0.8), 0.22, metallic=1.0),
            "clear": material("clear", (0.5, 0.53, 0.56), 0.18),
            "grey": material("grey", (0.3, 0.31, 0.33), 0.45),
            "orange": material("orange", (0.78, 0.2, 0.012), 0.42),
        }
        bpy.ops.object.empty_add()
        cable = bpy.context.object
        build(cable, mats)
        # The page's y axis points down, Blender's up: turn the other way.
        turn = -math.radians(degrees)
        cable.rotation_euler = (0, 0, turn)
        far = (LENGTH * math.cos(turn), LENGTH * math.sin(turn))
        left, right = min(0, far[0]) - MARGIN, max(0, far[0]) + MARGIN
        bottom, top = min(0, far[1]) - MARGIN, max(0, far[1]) + MARGIN
        width, height = right - left, top - bottom
        scale = PX_PER_MM * RENDER_SCALE
        scene.render.resolution_x = round(width * scale)
        scene.render.resolution_y = round(height * scale)
        scene.camera.location = ((left + right) / 2, (bottom + top) / 2, 200)
        scene.camera.data.ortho_scale = max(width, height)
        scene.render.filepath = str(OUT / f"{name}.png")
        bpy.ops.render.render(write_still=True)
        # In pixels of device.png: the picture's size, and where the plug's tip is in it.
        placement[name] = {
            "width": round(width * PX_PER_MM, 1), "height": round(height * PX_PER_MM, 1),
            "tip_x": round(-left * PX_PER_MM, 1), "tip_y": round(top * PX_PER_MM, 1),
            "degrees": degrees,
        }
    (OUT / "cables.json").write_text(json.dumps(placement, indent=1) + "\n")


if __name__ == "__main__":
    main()
