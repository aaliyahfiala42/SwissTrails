import numpy as np
import matplotlib.pyplot as plt

from matplotlib.animation import FuncAnimation, PillowWriter
from matplotlib.offsetbox import OffsetImage, AnnotationBbox
from matplotlib.patches import Circle
from PIL import Image as PILImage, ImageSequence
from IPython.display import Image as DisplayImage, display



k = 20 #control for randomness of early choices
h = 2 #control for strength of positive feedback

np.random.seed(3)
n_ants = 50
lengths = np.array([1.0, 2.0])
bridgeCount = np.array([0, 0], dtype=int)
pheromone = np.array([0.0, 0.0])
history = [{
        "ant": 0,
        "p1": 0.0,
        "p2": 0.0,
        "bridgeCount1": 0,
        "bridgeCount2": 0,
        "pheromone1": 0.0,
        "pheromone2": 0.0,
        "choice": 1
    }
]

#p_m+1 = (m_1 + k)^h / (m_1 + k)^h + (m_2 + k)^h
def bridgeProbability(pheromone, k, h):
    return (pheromone[0] + k) ** h / ((pheromone[0] + k) ** h + (pheromone[1] + k) ** h)


#run monte carlo experiment
for ant in range(1, n_ants + 1):
    p = bridgeProbability(pheromone, k, h)

  #random number between 0-1
    if np.random.rand() < p:
        choice = 0  #bridge 1
    else:
        choice = 1  #bridge 2

    bridgeCount[choice] += 1

    #leave the pheromone as 0 until the first ant return approx at a=20
    if (ant < 20):
        pheromone[choice] = 0.0
    else:
      #shorter bridge gets more pheromone
      pheromone[choice] += 1.0 / lengths[choice]

    history.append({
        "ant": ant,
        "p1": p,
        "p2": 1 - p,
        "bridgeCount1": bridgeCount[0],
        "bridgeCount2": bridgeCount[1],
        "pheromone1": pheromone[0],
        "pheromone2": pheromone[1],
        "choice": choice
    })


# -----------------------------
# Load ant image
# -----------------------------

ant_path = "/content/ant-silhouette.png"

ant_pil = PILImage.open(ant_path)

ant_frames = []
for frame in ImageSequence.Iterator(ant_pil):
    frame = frame.convert("RGBA")
    ant_frames.append(np.asarray(frame))

if len(ant_frames) == 0:
    raise ValueError("No frames found in ant image")

# -----------------------------
# Arc bridge geometry
# -----------------------------

nest = np.array([0.0, 0.0])
food = np.array([6.0, 0.0])

# Bridge 1 is a direct path
# Bridge 2 is an arc.
long_control = np.array([3.0, -8])


def straight_point(start, end, t):
    return start + t * (end - start)


def bezier_point(start, control, end, t):
    return (
        (1 - t) ** 2 * start
        + 2 * (1 - t) * t * control
        + t ** 2 * end
    )


def bridge_curve(choice, n_points=100):
    t_values = np.linspace(0, 1, n_points)

    if choice == 0:
        # Straight bridge
        points = np.array([
            straight_point(nest, food, t)
            for t in t_values
        ])
    else:
        # Long curved bridge
        points = np.array([
            bezier_point(nest, long_control, food, t)
            for t in t_values
        ])

    return points


def point_on_bridge(choice, t):
    if choice == 0:
        return straight_point(nest, food, t)
    else:
        return bezier_point(nest, long_control, food, t)


# -----------------------------
# Colors and style
# -----------------------------

# Change bridge colors here.
SHORT_BRIDGE_COLOR = "darkgreen"
LONG_BRIDGE_COLOR = "saddlebrown"

ANT_ZOOM = 0.01

max_pheromone = max(
    max(row["pheromone1"] for row in history),
    max(row["pheromone2"] for row in history)
)

# -----------------------------
# Animation timing
# -----------------------------

output_path = "ant_bridge_simulation.gif"

# One new ant starts every few animation frames.
# Smaller number = more ants on screen at once.
START_GAP = 4

# How long it takes one ant to go from nest to food.
ONE_WAY_FRAMES = 35

# Ant goes nest -> food -> nest
ROUND_TRIP_FRAMES = ONE_WAY_FRAMES * 2

# Total animation frames
total_animation_frames = (n_ants - 1) * START_GAP + ROUND_TRIP_FRAMES

FPS = 10


def ant_progress(elapsed):
    """
    Returns where the ant is on its trip.

    0.0 = nest
    1.0 = food

    First half: nest -> food
    Second half: food -> nest
    """
    if elapsed < ONE_WAY_FRAMES:
        return elapsed / ONE_WAY_FRAMES
    else:
        return 1 - ((elapsed - ONE_WAY_FRAMES) / ONE_WAY_FRAMES)


def active_ants_at_frame(frame_index):
    """
    Finds all ants currently walking at this animation frame.
    """
    active_ants = []

    for ant_index, row in enumerate(history):
        start_frame = ant_index * START_GAP
        elapsed = frame_index - start_frame

        if 0 <= elapsed <= ROUND_TRIP_FRAMES:
            choice = row["choice"]
            t = ant_progress(elapsed)
            position = point_on_bridge(choice, t)

            active_ants.append({
                "ant_index": ant_index,
                "choice": choice,
                "position": position,
                "t": t
            })

    return active_ants


# -----------------------------
# Animation
# -----------------------------

fig, (ax_scene, ax_info) = plt.subplots(
    1, 2,
    figsize=(11, 5),
    gridspec_kw={"width_ratios": [3, 1]}
)


def update(frame_index):
    ax_scene.clear()
    ax_info.clear()

    # This tells us how many ants have been released so far.
    latest_ant_index = min(frame_index // START_GAP, n_ants - 1)
    row = history[latest_ant_index]

    active_ants = active_ants_at_frame(frame_index)

    # -------------------------
    # Simulation scene
    # -------------------------

    ax_scene.set_xlim(-0.5, 6.8)

    # Your bridge 2 control point is -6.8,
    # so the y-limit needs to go low enough to show the full arc.
    ax_scene.set_ylim(-7.4, 1.7)

    ax_scene.set_aspect("equal")
    ax_scene.axis("off")

    short_curve = bridge_curve(choice=0)
    long_curve = bridge_curve(choice=1)

    # Bridge 1: direct path
    ax_scene.plot(
        short_curve[:, 0],
        short_curve[:, 1],
        linewidth=2,
        alpha=0.75,
        color=SHORT_BRIDGE_COLOR
    )

    # Bridge 2: long arc
    ax_scene.plot(
        long_curve[:, 0],
        long_curve[:, 1],
        linewidth=2,
        alpha=0.75,
        color=LONG_BRIDGE_COLOR
    )

    # Nest and food
    ax_scene.add_patch(Circle(nest, 0.15))
    ax_scene.add_patch(Circle(food, 0.15))

    ax_scene.text(nest[0], nest[1] + 0.3, "Nest", ha="center")
    ax_scene.text(food[0], food[1] + 0.3, "Food", ha="center")

    ax_scene.text(3.0, 0.35, "Bridge 1", ha="center")
    ax_scene.text(3.0, -6.95, "Bridge 2", ha="center")

    # Draw every active ant
    for active_ant in active_ants:
        ant_index = active_ant["ant_index"]
        ant_position = active_ant["position"]

        ant_image = ant_frames[(frame_index + ant_index) % len(ant_frames)]

        ant_box = OffsetImage(
            ant_image,
            zoom=ANT_ZOOM
        )

        ant_artist = AnnotationBbox(
            ant_box,
            ant_position,
            frameon=False
        )

        ax_scene.add_artist(ant_artist)

    # -------------------------
    # Current values on right
    # -------------------------

    ax_info.axis("off")

    bridge1_active = sum(1 for ant in active_ants if ant["choice"] == 0)
    bridge2_active = sum(1 for ant in active_ants if ant["choice"] == 1)

    waiting_ants = max(0, n_ants - latest_ant_index - 1)
    released_ants = latest_ant_index + 1

    info_text = (
        f"Total choices so far\n"
        f"Bridge 1: {row['bridgeCount1']}\n"
        f"Bridge 2: {row['bridgeCount2']}\n\n"

        f"Pheromone\n"
        f"Bridge 1: {row['pheromone1']:.2f}\n"
        f"Bridge 2: {row['pheromone2']:.2f}\n\n"

        f"Probability\n"
        f"P(Bridge 1): {row['p1']:.3f}\n"
        f"P(Bridge 2): {row['p2']:.3f}\n\n"
    )

    ax_info.text(
        0.05,
        0.95,
        info_text,
        ha="left",
        va="top",
        fontsize=11,
        bbox=dict(boxstyle="round", alpha=0.15)
    )

    return []


animation = FuncAnimation(
    fig,
    update,
    frames=total_animation_frames,
    interval=1000 / FPS,
    repeat=True
)

animation.save(output_path, writer=PillowWriter(fps=FPS))

plt.close(fig)

print(f"Saved animation to {output_path}")

display(DisplayImage(filename=output_path))

