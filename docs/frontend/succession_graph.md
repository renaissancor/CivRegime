# Succession Graph Visualization

## Overview

The succession graph visualizes **how polities succeed one another** based on territorial control (POLITY_TERRITORY) and cultural continuity (ethnicity, language, religion).

---

## Data Pipeline for Succession Graph

### Step 1: Build Polity-Territory Map
From `POLITY_TERRITORY`, create a map of which polities controlled which territories:

```javascript
const polityTerritoriesMap = {};

polityTerritories.forEach(period => {
  // period = { territory_id, polity_id, start, end }
  if (!polityTerritoriesMap[period.polity_id]) {
    polityTerritoriesMap[period.polity_id] = [];
  }
  polityTerritoriesMap[period.polity_id].push({
    territory: period.territory_id,
    start: period.start,
    end: period.end
  });
});

// Result:
// {
//   "1": [{ territory: "egypt", start: -2686, end: -2181 }],
//   "5": [{ territory: "egypt", start: -2181, end: -2055 }],
//   ...
// }
```

### Step 2: Find Succession Edges
For each polity, find which polities succeed it:

```javascript
const successionEdges = [];

polities.forEach(polity => {
  const successors = findSuccessors(polity, polityTerritoriesMap, polities);
  
  successors.forEach(successor => {
    successionEdges.push({
      from: polity.id,
      to: successor.id,
      type: successor.type,  // "direct", "weak", "ethnic", "none"
      sharedTerritories: successor.territories,
      sharedEthnicity: successor.sameEthnicity
    });
  });
});
```

### Step 3: Render Graph
Visualize edges with different colors based on type.

---

## Successor Detection Algorithm

```javascript
function findSuccessors(polity, polityTerritoriesMap, allPolities) {
  const polityTerritoriesAtEnd = polityTerritoriesMap[polity.id]
    .filter(t => t.end === polity.end);
  
  const successors = [];
  
  allPolities.forEach(candidate => {
    if (candidate.id === polity.id) return; // Skip self
    
    // Does candidate control any territories polity controlled at end?
    const sharedTerritories = polityTerritoriesMap[candidate.id]
      .filter(ct => polityTerritoriesAtEnd.some(pt => pt.territory === ct.territory))
      .map(t => t.territory);
    
    // Does candidate have same ethnicity?
    const sameEthnicity = candidate.ethnicity_id === polity.ethnicity_id;
    
    // Does candidate start when polity ends (temporal continuity)?
    const continuousTransition = candidate.start === polity.end;
    
    // Classify succession
    let type = "none";
    if (sharedTerritories.length > 0) {
      if (sameEthnicity) {
        type = continuousTransition ? "direct" : "weak";
      } else {
        type = "weak";
      }
    } else if (sameEthnicity && candidate.start <= polity.end + 100) {
      // Allow small gaps for ethnic continuity (migrations, etc.)
      type = "ethnic";
    }
    
    if (type !== "none") {
      successors.push({
        id: candidate.id,
        type,
        territories: sharedTerritories,
        sameEthnicity
      });
    }
  });
  
  return successors;
}
```

---

## Visualization Types

### 1. Linear Timeline

Shows polities as bars on a timeline, with succession arrows connecting them.

```
Timeline:
-2686  ┌─────────────────────────┐
       │ Old Kingdom Egypt (1)   │ ─→ First Intermediate (5) ─→ Middle Kingdom (7)
       └─────────────────────────┘
       ↓ (direct succession)

-2181  ┌──────────────────┐
       │ First Interm (5) │
       └──────────────────┘
```

**Best for:**
- Seeing polity duration and relative timing
- Following a single region's history
- Spotting succession gaps

**Implementation:**
- X-axis: years
- Y-axis: territories (stacked)
- Rectangles: polities
- Arrows: succession edges

---

### 2. Flow Diagram (Directed Graph)

Shows polities as nodes, succession relationships as directed edges.

```
      ┌──────────────────┐
      │ Seljuk Empire    │
      └────────┬─────────┘
               │ Direct (Turkic, Anatolia)
               ↓
      ┌──────────────────┐
      │ Seljuk Rum       │
      └────────┬─────────┘
               │ Direct (Turkic, Anatolia)
               ↓
      ┌──────────────────┐
      │ Ottoman Empire   │
      └──────────────────┘
```

**Best for:**
- Showing succession chains (A → B → C)
- Visualizing multiple successors (one polity → many)
- Understanding ethnic/cultural lineages

**Implementation:**
- Nodes: polities
- Edges: colored by succession type
- Layout: hierarchical or force-directed

---

### 3. Territory Timeline (per Territory)

Shows which polities controlled a single territory over time.

```
Egypt Control History:
┌───────────────────────────────────────────────────────────────┐
│ Old Kingdom (-2686 to -2181) ─ First Intermediate ─ Middle Kingdom │
│                                                                 │
│ New Kingdom (-1550 to -1070) ─ Late Period ─ Ptolemaic ─ Roman │
└───────────────────────────────────────────────────────────────┘
 -2686                              0                            1453
```

**Best for:**
- Understanding a single territory's history
- Seeing weak successions (different ethnicity, same territory)
- Long-term territorial continuity

**Implementation:**
- Horizontal bars for each polity controlling the territory
- Label with polity name and ethnicity
- Arrows showing transitions

---

### 4. Sankey Diagram (Flow by Territory)

Shows how territorial control flows from one polity to the next.

```
Polity A          Territory Control Flow          Polity B
  │                                                 │
  ├─ Egypt ────────────────────────────────────→ Egypt
  ├─ Mesopotamia ────────────────┐
  │                              ├─→ (lost) Mesopotamia
  ├─ Levant ──────────────────────┘
  │
  └─ Greece ──────────────────────────────────→ Greece
```

**Best for:**
- Visualizing territorial fragmentation/consolidation
- Seeing which territories stay vs. get lost
- Understanding empire stability

**Implementation:**
- Flow width proportional to number of shared territories
- Colors represent ethnicity or dynasty
- Nodes are polities, edges are territories

---

## Color Scheme for Succession Types

Use consistent colors across all visualizations:

| Succession Type | Color | Meaning |
|---|---|---|
| **Direct** | 🟢 Green | Same territory + same ethnicity (strong continuity) |
| **Weak** | 🟡 Yellow | Same territory + different ethnicity (territorial continuity) |
| **Ethnic** | 🟠 Orange | Different territory + same ethnicity (cultural continuity) |
| **None** | ⚪ Gray/None | No connection |

**Optional modifiers:**
- **Dashed edge:** Temporal gap (successor doesn't start immediately after predecessor ends)
- **Bold edge:** Multiple shared territories
- **Thin edge:** Single shared territory

---

## Implementation Examples

### React Component: Succession Graph

```javascript
import { useEffect, useState } from 'react';
import { PolitySuccessionGraph } from './components';

export function SuccessionViewer({ polities, polityTerritories }) {
  const [edges, setEdges] = useState([]);
  
  useEffect(() => {
    const polityMap = {};
    polityTerritories.forEach(period => {
      if (!polityMap[period.polity_id]) {
        polityMap[period.polity_id] = [];
      }
      polityMap[period.polity_id].push(period);
    });
    
    const successionEdges = [];
    polities.forEach(polity => {
      const polityEndTerritories = polityMap[polity.id]
        .filter(p => p.end === polity.end)
        .map(p => p.territory_id);
      
      polities.forEach(candidate => {
        if (candidate.id === polity.id) return;
        
        const candidateStartTerritories = polityMap[candidate.id]
          .filter(p => p.start === candidate.start)
          .map(p => p.territory_id);
        
        const shared = polityEndTerritories.filter(t => 
          candidateStartTerritories.includes(t)
        );
        
        const sameEthnicity = candidate.ethnicity_id === polity.ethnicity_id;
        
        let type = "none";
        if (shared.length > 0) {
          type = sameEthnicity && candidate.start === polity.end 
            ? "direct" 
            : "weak";
        } else if (sameEthnicity && Math.abs(candidate.start - polity.end) < 50) {
          type = "ethnic";
        }
        
        if (type !== "none") {
          successionEdges.push({
            from: polity.id,
            to: candidate.id,
            type,
            territories: shared
          });
        }
      });
    });
    
    setEdges(successionEdges);
  }, [polities, polityTerritories]);
  
  return <PolitySuccessionGraph nodes={polities} edges={edges} />;
}
```

### D3.js Force-Directed Graph

```javascript
import * as d3 from 'd3';

function renderSuccessionGraph(svgSelector, polities, edges) {
  const svg = d3.select(svgSelector);
  const width = svg.attr('width');
  const height = svg.attr('height');
  
  const simulation = d3.forceSimulation(polities)
    .force('link', d3.forceLink(edges).id(d => d.id).distance(100))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2));
  
  const links = svg.selectAll('.link')
    .data(edges)
    .enter()
    .append('line')
    .attr('class', 'link')
    .attr('stroke', d => {
      const colors = { direct: '#4CAF50', weak: '#FFC107', ethnic: '#FF9800' };
      return colors[d.type];
    })
    .attr('stroke-width', 2);
  
  const nodes = svg.selectAll('.node')
    .data(polities)
    .enter()
    .append('circle')
    .attr('class', 'node')
    .attr('r', 8)
    .attr('fill', d => getEthnicityColor(d.ethnicity_id))
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended));
  
  const labels = svg.selectAll('.label')
    .data(polities)
    .enter()
    .append('text')
    .attr('class', 'label')
    .text(d => d.name)
    .attr('font-size', '10px');
  
  simulation.on('tick', () => {
    links
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
    
    nodes
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);
    
    labels
      .attr('x', d => d.x)
      .attr('y', d => d.y);
  });
}
```

---

## Interactive Features

### Hover Effects
- **Hover polity:** Highlight all edges (successors + predecessors)
- **Hover edge:** Highlight shared territories in tooltip
- **Hover territory:** Show all polities that controlled it

### Click/Selection
- **Click polity:** Show detailed info (name, dates, territories, ruling ethnicity)
- **Click edge:** Show succession details (transition type, shared territories, temporal gap)
- **Filter by ethnicity:** Show only regimes with selected ethnicity

### Zoom/Pan
- Allow panning and zooming the graph
- Maintain readability at different scales

---

## Performance Optimization

For large graphs (300+ polities, 1000+ edges):

1. **Level-of-Detail (LOD):**
   - At zoom < 0.3: Show only major polities (large empires)
   - At zoom < 0.7: Show major + medium polities
   - At full zoom: Show all polities

2. **Edge Culling:**
   - Hide weak/ethnic edges unless specifically toggled
   - Show only "direct" succession by default

3. **Spatial Index:**
   - Use quadtree for hit detection
   - Defer rendering of offscreen nodes

---

## Examples to Implement

1. **Egypt's 3000-year history:** Territory timeline showing 20+ polities
2. **Turkic succession chain:** Seljuk → Seljuk Rum → Ottoman (direct succession)
3. **Rome's fragmentation:** Western Roman Empire → Visigothic, Frankish, etc. (multiple weak successors)
4. **Conquest chains:** Persian → Macedonian → Seleucid → Roman (all weak successions on same territory)

---
