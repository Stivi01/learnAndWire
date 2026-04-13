import { CommonModule } from '@angular/common';
import { Component, effect, ElementRef, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';


interface Hole {
  id: string; 
  x: number;
  y: number;
}

interface Wire {
  id: string;
  fromHoleId: string;
  toHoleId: string;
  color: string;
}

type ComponentType = 'LED' | 'RESISTOR' | 'BUTTON' | 'POTENTIOMETER' | 'MULTIMETER';

interface BreadboardComponent {
  id: string;
  type: ComponentType;
  pini: { id: string; holeId: string; relativeX: number; relativeY: number }[];
  state: any; 
}

@Component({
  selector: 'app-breadbord',
  imports: [CommonModule,FormsModule],
  standalone: true,
  templateUrl: './breadbord.html',
  styleUrl: './breadbord.scss',
})
export class Breadbord {
@ViewChild('breadboardSvg') svgElement!: ElementRef;

  // Breadboard extins la dimensiuni reale
  rowsTop = ['A', 'B', 'C', 'D', 'E'];
  rowsBottom = ['F', 'G', 'H', 'I', 'J'];
  cols = Array.from({ length: 60 }, (_, i) => i + 1); // 60 de coloane
  spacing = 20;
  originX = 50;
  originY = 100;

  // Starea
  allHoles = signal<Hole[]>([]);
  wires = signal<Wire[]>([]);
  components = signal<BreadboardComponent[]>([]);
  
  // Interacțiune
  activeWireStartHole = signal<Hole | null>(null);
  mousePos = signal({ x: 0, y: 0 });
  draggingComponentType = signal<ComponentType | null>(null);
  
  // NOU: Componenta selectată pentru a-i edita proprietățile
  selectedComponentId = signal<string | null>(null);

  availableComponents: { type: ComponentType, label: string, color: string }[] = [
    { type: 'LED', label: 'LED', color: '#ff4757' },
    { type: 'RESISTOR', label: 'Rezistență', color: '#d2b48c' },
    { type: 'POTENTIOMETER', label: 'Potențiometru', color: '#34495e' },
    { type: 'BUTTON', label: 'Buton', color: '#ecf0f1' },
    { type: 'MULTIMETER', label: 'Multimetru', color: '#f1c40f' }
  ];

  Math = Math;
  constructor() {
    this.generateHoles();
    effect(() => {
      this.wires();
      this.components();
      setTimeout(() => this.runNumericalSimulation(), 10); 
    });
  }

  // --- 1. Generarea Grilei Extinse ---
  private generateHoles() {
    const holes: Hole[] = [];
    
    // Șine de putere SUS
    this.cols.forEach(c => {
      holes.push({ id: `power-plus-top-${c}`, x: this.originX + (c * this.spacing), y: this.originY - 60 });
      holes.push({ id: `power-minus-top-${c}`, x: this.originX + (c * this.spacing), y: this.originY - 40 });
    });

    // Grila principală (A-E)
    this.rowsTop.forEach((r, rIdx) => {
      this.cols.forEach(c => {
        holes.push({ id: `row${r}-col${c}`, x: this.originX + (c * this.spacing), y: this.originY + (rIdx * this.spacing) });
      });
    });

    // Grila inferioară (F-J) - cu un gap pentru circuite integrate
    const bottomStartY = this.originY + (this.rowsTop.length * this.spacing) + 30; // Gap de 30px
    this.rowsBottom.forEach((r, rIdx) => {
      this.cols.forEach(c => {
        holes.push({ id: `row${r}-col${c}`, x: this.originX + (c * this.spacing), y: bottomStartY + (rIdx * this.spacing) });
      });
    });

    // Șine de putere JOS
    const powerBottomY = bottomStartY + (this.rowsBottom.length * this.spacing) + 20;
    this.cols.forEach(c => {
      holes.push({ id: `power-plus-bottom-${c}`, x: this.originX + (c * this.spacing), y: powerBottomY });
      holes.push({ id: `power-minus-bottom-${c}`, x: this.originX + (c * this.spacing), y: powerBottomY + 20 });
    });

    this.allHoles.set(holes);
  }

  // --- 2. Interacțiuni Mouse & Drag ---
  getHoleById(id: string) { return this.allHoles().find(h => h.id === id); }
  
  selectComponent(id: string) { this.selectedComponentId.set(id); }
  getSelectedComponent() { return this.components().find(c => c.id === this.selectedComponentId()); }

  updateComponentState(id: string, newState: any) {
    this.components.update(comps => comps.map(c => c.id === id ? { ...c, state: { ...c.state, ...newState } } : c));
  }

  onMouseDownHole(hole: Hole) { this.activeWireStartHole.set(hole); }
  
  onMouseMove(event: MouseEvent) {
    if (this.activeWireStartHole()) {
      const svg = (event.currentTarget as HTMLElement).getBoundingClientRect();
      this.mousePos.set({ x: event.clientX - svg.left, y: event.clientY - svg.top });
    }
  }

  onMouseUpHole(endHole: Hole) {
    const start = this.activeWireStartHole();
    if (start && start.id !== endHole.id) {
      this.wires.update(prev => [...prev, { id: `wire-${Date.now()}`, fromHoleId: start.id, toHoleId: endHole.id, color: '#2ed573' }]);
    }
    this.activeWireStartHole.set(null);
  }

  onDragStart(type: ComponentType, event: DragEvent) {
    this.draggingComponentType.set(type);
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', type); 
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  onDragOver(event: DragEvent) { event.preventDefault(); }

  onDropOnHole(hole: Hole, event: DragEvent) {
    event.preventDefault();
    const type = this.draggingComponentType();
    if (!type) return;

    const compId = `${type.toLowerCase()}-${Date.now()}`;
    let newComponent: BreadboardComponent | null = null;

    const getHoleByOffset = (startHoleId: string, colOffset: number): string | null => {
      const match = startHoleId.match(/row([A-J])-col(\d+)/);
      if (match) {
        return `row${match[1]}-col${parseInt(match[2], 10) + colOffset}`;
      }
      return null;
    };

    if (type === 'LED') {
      const cathodeHoleId = getHoleByOffset(hole.id, 1);
      if (cathodeHoleId) newComponent = { id: compId, type: 'LED', state: { isOn: false, isBurnt: false, current: 0, color: '#ff4757' }, pini: [{ id: 'anode', holeId: hole.id, relativeX: 0, relativeY: 0 }, { id: 'cathode', holeId: cathodeHoleId, relativeX: 20, relativeY: 0 }] };
    } else if (type === 'RESISTOR') {
      const pin2 = getHoleByOffset(hole.id, 4);
      if (pin2) newComponent = { id: compId, type: 'RESISTOR', state: { ohms: 1000 }, pini: [{ id: 'p1', holeId: hole.id, relativeX: 0, relativeY: 0 }, { id: 'p2', holeId: pin2, relativeX: 80, relativeY: 0 }] };
    } else if (type === 'POTENTIOMETER') {
      const pin2 = getHoleByOffset(hole.id, 2);
      if (pin2) newComponent = { id: compId, type: 'POTENTIOMETER', state: { maxOhms: 10000, value: 5000 }, pini: [{ id: 'p1', holeId: hole.id, relativeX: 0, relativeY: 0 }, { id: 'p2', holeId: pin2, relativeX: 40, relativeY: 0 }] };
    } else if (type === 'BUTTON') {
      const pin2 = getHoleByOffset(hole.id, 2);
      if (pin2) newComponent = { id: compId, type: 'BUTTON', state: { isPressed: false }, pini: [{ id: 'p1', holeId: hole.id, relativeX: 0, relativeY: 0 }, { id: 'p2', holeId: pin2, relativeX: 40, relativeY: 0 }] };
    } else if (type === 'MULTIMETER') {
      const pin2 = getHoleByOffset(hole.id, 5);
      if (pin2) newComponent = { id: compId, type: 'MULTIMETER', state: { readingV: 0 }, pini: [{ id: 'vcc', holeId: hole.id, relativeX: 0, relativeY: 0 }, { id: 'gnd', holeId: pin2, relativeX: 100, relativeY: 0 }] };
    }

    if (newComponent) {
      this.components.update(comps => [...comps, newComponent!]);
      this.selectComponent(compId); // Selectează automat la plasare
    }
    this.draggingComponentType.set(null);
  }

  onRightClickComponent(event: MouseEvent, compId: string) {
    event.preventDefault();
    this.components.update(comps => comps.filter(c => c.id !== compId));
    if (this.selectedComponentId() === compId) this.selectedComponentId.set(null);
  }

  deleteComponent(id: string) {
    this.components.update(comps => comps.filter(c => c.id !== id));
    if (this.selectedComponentId() === id) {
      this.selectedComponentId.set(null);
    }
  }

  // Permite ștergerea firelor la click dreapta
  onRightClickWire(event: MouseEvent, wireId: string) {
    event.preventDefault();
    this.wires.update(ws => ws.filter(w => w.id !== wireId));
  }

  // --- 3. MOTORUL DE SIMULARE NUMERICĂ (Fizică & Legea lui Ohm) ---
  private runNumericalSimulation() {
    const VCC_VOLTAGE = 9.0; // Sursa noastră magică de 9V
    const connections = new Map<string, string[]>();
    
    // 1. Construim Nodusurile Electrice de bază (șine și coloane interne)
    const addConnection = (a: string, b: string) => {
      if(!connections.has(a)) connections.set(a, []);
      if(!connections.has(b)) connections.set(b, []);
      connections.get(a)!.push(b);
      connections.get(b)!.push(a);
    };

    // Conectăm coloanele (A-E și F-J separat)
    this.cols.forEach(c => {
      this.rowsTop.forEach(r => addConnection(`row${this.rowsTop[0]}-col${c}`, `row${r}-col${c}`));
      this.rowsBottom.forEach(r => addConnection(`row${this.rowsBottom[0]}-col${c}`, `row${r}-col${c}`));
    });

    // Conectăm șinele de putere orizontal
    this.cols.forEach(c => {
      if(c > 1) {
        addConnection(`power-plus-top-${c-1}`, `power-plus-top-${c}`);
        addConnection(`power-minus-top-${c-1}`, `power-minus-top-${c}`);
        addConnection(`power-plus-bottom-${c-1}`, `power-plus-bottom-${c}`);
        addConnection(`power-minus-bottom-${c-1}`, `power-minus-bottom-${c}`);
      }
    });

    // Conectăm firele utilizatorului (rezistență 0)
    this.wires().forEach(w => addConnection(w.fromHoleId, w.toHoleId));

    // Funcție pentru a găsi toate găurile dintr-un "Nod Electric" (equipotential)
    const getElectricalNode = (startHole: string): Set<string> => {
      const visited = new Set<string>();
      const queue = [startHole];
      visited.add(startHole);
      while(queue.length > 0) {
        const curr = queue.shift()!;
        const neighbors = connections.get(curr) || [];
        for(const n of neighbors) {
          if(!visited.has(n)) { visited.add(n); queue.push(n); }
        }
      }
      return visited;
    };

    let simulationChanged = false;
    const comps = this.components();

    // 2. Simulăm fiecare LED calculând rezistența pe calea sa
    const updatedComponents = comps.map(comp => {
      if (comp.type === 'LED') {
        if (comp.state.isBurnt) return comp; // Un LED ars rămâne ars :(

        const anodeHole = comp.pini.find(p => p.id === 'anode')?.holeId;
        const cathodeHole = comp.pini.find(p => p.id === 'cathode')?.holeId;
        if (!anodeHole || !cathodeHole) return comp;

        // Pathfinding simplificat: căutăm drum de la Anod la VCC și Catod la GND
        // Adunăm rezistențele întâlnite pe parcurs.
        const calculatePathResistance = (startHole: string, targetType: 'VCC' | 'GND'): number | null => {
          let totalR = 0;
          let currentNodes = getElectricalNode(startHole);
          
          // Verificăm dacă suntem deja la sursă
          const isAtSource = Array.from(currentNodes).some(h => 
            targetType === 'VCC' ? h.includes('power-plus') : h.includes('power-minus')
          );
          if (isAtSource) return 0;

          // Căutăm componente care fac legătura cu alte noduri
          for (const c of comps) {
            if (c.type === 'RESISTOR' || c.type === 'POTENTIOMETER' || c.type === 'BUTTON') {
              const p1 = c.pini[0].holeId;
              const p2 = c.pini[1].holeId;
              
              if (currentNodes.has(p1) || currentNodes.has(p2)) {
                // Trecem prin componentă
                let compResistance = 0;
                if (c.type === 'RESISTOR') compResistance = c.state.ohms;
                if (c.type === 'POTENTIOMETER') compResistance = c.state.value;
                if (c.type === 'BUTTON') {
                  if (!c.state.isPressed) continue; // Circuit deschis
                  compResistance = 0;
                }

                const nextHole = currentNodes.has(p1) ? p2 : p1;
                const nextNodes = getElectricalNode(nextHole);
                
                const reachesSource = Array.from(nextNodes).some(h => 
                  targetType === 'VCC' ? h.includes('power-plus') : h.includes('power-minus')
                );

                if (reachesSource) {
                  return totalR + compResistance;
                }
              }
            }
          }
          return null; // Niciun drum găsit
        };

        const rToVcc = calculatePathResistance(anodeHole, 'VCC');
        const rToGnd = calculatePathResistance(cathodeHole, 'GND');

        let isBurnt = false;
        let isOn = false;
        let current = 0;

        if (rToVcc !== null && rToGnd !== null) {
          const totalResistance = rToVcc + rToGnd;
          
          if (totalResistance < 150) {
            // Legea lui Ohm: Dacă rezistența e prea mică, curentul e imens -> SE ARDE
            isBurnt = true;
          } else {
            // Curentul aproximativ. (Ignorăm căderea de tensiune de 2V a LED-ului pentru simplitate)
            current = VCC_VOLTAGE / totalResistance;
            if (current > 0.001) isOn = true; // Minim 1mA ca să se aprindă vizibil
          }
        }

        if (comp.state.isOn !== isOn || comp.state.isBurnt !== isBurnt || comp.state.current !== current) {
          simulationChanged = true;
          return { ...comp, state: { ...comp.state, isOn, isBurnt, current } };
        }
      }

      // 3. Multimetru: Citirea Tensiunii
      if (comp.type === 'MULTIMETER') {
         const vccNode = getElectricalNode(comp.pini[0].holeId);
         const gndNode = getElectricalNode(comp.pini[1].holeId);
         
         const readsVcc = Array.from(vccNode).some(h => h.includes('power-plus'));
         const readsGnd = Array.from(gndNode).some(h => h.includes('power-minus'));
         
         const readingV = (readsVcc && readsGnd) ? VCC_VOLTAGE : 0;
         
         if (comp.state.readingV !== readingV) {
           simulationChanged = true;
           return { ...comp, state: { ...comp.state, readingV } };
         }
      }

      return comp;
    });

    if (simulationChanged) this.components.set(updatedComponents);
  }

  // Helpers SVG
  getWirePath(w: Wire | null, startHole?: Hole | null, endPos?: {x: number, y: number}): string {
    let startX, startY, endX, endY;
    if (w) {
      const start = this.getHoleById(w.fromHoleId);
      const end = this.getHoleById(w.toHoleId);
      if (!start || !end) return '';
      startX = start.x; startY = start.y; endX = end.x; endY = end.y;
    } else if (startHole && endPos) {
      startX = startHole.x; startY = startHole.y; endX = endPos.x; endY = endPos.y;
    } else return '';

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const dist = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const sag = dist * 0.25; 
    return `M ${startX} ${startY} Q ${midX} ${midY + sag} ${endX} ${endY}`;
  }

  // 3. Exportul plăcii sub formă de fotografie (SVG vectorial)
  exportAsSVG() {
    if (!this.svgElement) return;
    
    const svgNode = this.svgElement.nativeElement;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgNode);
    
    // Asigurăm prezența namespace-ului SVG (necesar pentru fișiere de sine stătătoare)
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    // Creăm un fișier fals în memoria browserului și forțăm descărcarea
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `circuit-${new Date().getTime()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
