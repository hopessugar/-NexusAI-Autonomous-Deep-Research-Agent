# ============================================
# NexusAI - Chart Generator Tool
# ============================================
# Creates beautiful, publication-grade charts from data using Matplotlib.
# Styled specifically to match the soft sage & neumorphic UI aesthetic.
# Charts are returned as base64-encoded PNG images for embedding in reports.

import io
import base64
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import asyncio
from backend.tools.base_tool import BaseTool


# ---- Designer Palette (Matches UI Theme) ----
CHART_COLORS = [
    "#4e6b50",  # Primary Sage Green
    "#7c8f7a",  # Muted Sage
    "#c47d5e",  # Warm Terracotta
    "#486d88",  # Dusty Slate Blue
    "#c99b42",  # Muted Antique Gold
    "#6b7d69",  # Olive Leaf
    "#7b6279",  # Heather Plum
    "#447d77",  # Eucalyptus Teal
    "#b3666b",  # Dusty Coral
    "#3d5440",  # Forest Moss
]

BG_COLOR = "#e8ede2"       # Matches --bg-light
CARD_COLOR = "#eef3e9"     # Slightly lighter inner canvas
TEXT_MAIN = "#233224"      # Dark forest primary text
TEXT_MUTED = "#556857"     # Muted secondary text
GRID_COLOR = "#cad4c5"     # Soft subtle gridline
BORDER_COLOR = "#b8beb2"   # Baseline spine


class ChartGeneratorTool(BaseTool):
    """
    Generates beautiful, themed charts from data.
    Returns charts as base64-encoded PNG strings for direct embedding.
    """

    @property
    def name(self) -> str:
        return "chart_generator"

    @property
    def description(self) -> str:
        return "Generate visual charts (bar, pie/donut, line) from data."

    async def execute(self, chart_data: list = None) -> dict:
        """
        Generate charts from the provided data.
        
        Args:
            chart_data: List of chart specifications, each with:
                - chart_type: "bar", "pie", "donut", or "line"
                - title: Chart title
                - labels: List of category labels
                - values: List of numerical values
                - description: Optional summary
                
        Returns:
            Dict with list of base64-encoded chart images
        """
        if not chart_data:
            return {"success": True, "data": {"charts": []}, "error": None}

        try:
            charts = []
            for spec in chart_data:
                chart_type = spec.get("chart_type", "bar").lower()
                title = spec.get("title", "Data Visualization")
                description = spec.get("description", "")
                labels = spec.get("labels", [])
                values = spec.get("values", [])

                if not labels or not values:
                    continue

                # Ensure values are numbers
                clean_values = []
                for v in values:
                    try:
                        clean_values.append(float(v))
                    except (ValueError, TypeError):
                        clean_values.append(0.0)
                values = clean_values

                # Ensure labels and values have matching lengths
                min_len = min(len(labels), len(values))
                labels = [str(l) for l in labels[:min_len]]
                values = values[:min_len]

                if not labels:
                    continue

                # Generate chart in thread pool
                chart_b64 = await asyncio.to_thread(
                    self._create_chart, chart_type, title, description, labels, values
                )
                if chart_b64:
                    charts.append({
                        "image": chart_b64,
                        "title": title,
                        "description": description,
                        "type": chart_type
                    })

            return {
                "success": True,
                "data": {"charts": charts},
                "error": None
            }

        except Exception as e:
            return {"success": False, "data": {"charts": []}, "error": f"Chart generation failed: {str(e)}"}

    def _create_chart(self, chart_type: str, title: str, description: str, labels: list, values: list) -> str:
        """Create a single high-aesthetic chart matching the UI and return as base64 PNG."""
        plt.rcParams['font.family'] = 'sans-serif'
        plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Helvetica', 'sans-serif']
        
        # Decide orientation for bar chart: horizontal if long labels or > 5 items
        is_horizontal_bar = False
        if chart_type in ["bar", "column"]:
            if any(len(str(lbl)) > 11 for lbl in labels) or len(labels) > 6:
                is_horizontal_bar = True

        fig, ax = plt.subplots(figsize=(8.2, 4.8), dpi=180)
        fig.patch.set_facecolor(BG_COLOR)
        ax.set_facecolor(BG_COLOR)

        num_items = len(labels)
        colors = [CHART_COLORS[i % len(CHART_COLORS)] for i in range(num_items)]

        # --- DONUT / PIE CHART ---
        if chart_type in ["pie", "donut"]:
            wedges, texts, autotexts = ax.pie(
                values,
                labels=labels,
                colors=colors,
                autopct="%1.1f%%",
                pctdistance=0.76,
                startangle=140,
                wedgeprops=dict(width=0.44, edgecolor=BG_COLOR, linewidth=2.5),
                textprops={"color": TEXT_MAIN, "fontsize": 9.5, "weight": "normal"}
            )
            for at in autotexts:
                at.set_color("#ffffff")
                at.set_fontsize(8.5)
                at.set_weight("bold")

        # --- LINE CHART ---
        elif chart_type == "line":
            primary_color = CHART_COLORS[0]
            secondary_color = CHART_COLORS[2]
            
            ax.plot(range(len(labels)), values, color=primary_color, linewidth=2.8,
                    marker="o", markersize=7.5, markerfacecolor=secondary_color,
                    markeredgecolor="#ffffff", markeredgewidth=1.8, zorder=4)
            ax.fill_between(range(len(labels)), values, alpha=0.18, color=primary_color, zorder=2)
            
            ax.grid(axis="y", color=GRID_COLOR, linestyle="--", linewidth=0.8, alpha=0.7, zorder=1)
            ax.set_xticks(range(len(labels)))
            ax.set_xticklabels(labels, rotation=25 if any(len(str(l)) > 8 for l in labels) else 0,
                               ha="right" if any(len(str(l)) > 8 for l in labels) else "center",
                               fontsize=9, color=TEXT_MAIN)
            ax.tick_params(axis="y", colors=TEXT_MUTED, labelsize=8.5)

            # Value labels on points
            for i, val in enumerate(values):
                ax.text(i, val + (max(values) * 0.03 if max(values) > 0 else 0.5),
                        f"{val:g}", ha="center", va="bottom", color=TEXT_MAIN, fontsize=8.5, fontweight="bold")

        # --- HORIZONTAL BAR CHART ---
        elif is_horizontal_bar:
            y_pos = range(len(labels))
            bars = ax.barh(y_pos, values, color=colors, height=0.55,
                           edgecolor=BG_COLOR, linewidth=1.2, zorder=3)
            ax.grid(axis="x", color=GRID_COLOR, linestyle="--", linewidth=0.8, alpha=0.7, zorder=0)
            ax.set_yticks(y_pos)
            ax.set_yticklabels(labels, fontsize=9.2, color=TEXT_MAIN)
            ax.tick_params(axis="x", colors=TEXT_MUTED, labelsize=8.5)

            # Labels beside horizontal bars
            max_v = max(values) if values else 1.0
            offset = max_v * 0.02 if max_v > 0 else 0.5
            for bar, val in zip(bars, values):
                ax.text(bar.get_width() + offset, bar.get_y() + bar.get_height() / 2,
                        f"{val:g}", ha="left", va="center", color=TEXT_MAIN, fontsize=8.5, fontweight="bold")

        # --- VERTICAL BAR CHART (DEFAULT) ---
        else:
            x_pos = range(len(labels))
            bars = ax.bar(x_pos, values, color=colors, width=0.54,
                          edgecolor=BG_COLOR, linewidth=1.2, zorder=3)
            ax.grid(axis="y", color=GRID_COLOR, linestyle="--", linewidth=0.8, alpha=0.7, zorder=0)
            ax.set_xticks(x_pos)
            ax.set_xticklabels(labels, fontsize=9.2, color=TEXT_MAIN)
            ax.tick_params(axis="y", colors=TEXT_MUTED, labelsize=8.5)

            # Value labels on top of bars
            max_v = max(values) if values else 1.0
            offset = max_v * 0.02 if max_v > 0 else 0.5
            for bar, val in zip(bars, values):
                ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + offset,
                        f"{val:g}", ha="center", va="bottom", color=TEXT_MAIN, fontsize=8.8, fontweight="bold")

        # Styling frames & title
        ax.set_title(title, color=TEXT_MAIN, fontsize=12.5, fontweight="bold", pad=16)
        
        # Remove superfluous borders
        for side in ["top", "right"]:
            ax.spines[side].set_visible(False)
        
        if chart_type in ["pie", "donut"]:
            for side in ["left", "bottom"]:
                ax.spines[side].set_visible(False)
        elif is_horizontal_bar:
            ax.spines["left"].set_color(BORDER_COLOR)
            ax.spines["bottom"].set_visible(False)
        else:
            ax.spines["left"].set_visible(False)
            ax.spines["bottom"].set_color(BORDER_COLOR)

        plt.tight_layout(pad=1.8)

        # Convert to base64
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=180, bbox_inches="tight",
                    facecolor=fig.get_facecolor(), edgecolor="none")
        buf.seek(0)
        encoded = base64.b64encode(buf.read()).decode("utf-8")
        plt.close(fig)

        return f"data:image/png;base64,{encoded}"


# Singleton instance
chart_generator_tool = ChartGeneratorTool()
