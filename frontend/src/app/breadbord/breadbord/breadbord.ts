import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  ElementRef,
  HostListener,
  signal,
  ViewChild,
} from '@angular/core';
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

type ComponentType =
  | 'LED'
  | 'RESISTOR'
  | 'BUTTON'
  | 'POTENTIOMETER'
  | 'MULTIMETER'
  | 'CAPACITOR'
  | 'DIODE'
  | 'SWITCH'
  | 'BUZZER'
  | 'TRANSISTOR_NPN'
  | 'TRANSISTOR_PNP'
  | 'INDUCTOR';

interface BreadboardComponent {
  id: string;
  type: ComponentType;
  pini: {
    id: string;
    holeId: string;
    relativeX: number;
    relativeY: number;
  }[];
  state: any;
}

@Component({
  selector: 'app-breadbord',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './breadbord.html',
  styleUrl: './breadbord.scss',
})
export class Breadbord {
  @ViewChild('breadboardSvg') svgElement!: ElementRef<SVGSVGElement>;

  rowsTop = ['A', 'B', 'C', 'D', 'E'];
  rowsBottom = ['F', 'G', 'H', 'I', 'J'];
  cols = Array.from({ length: 60 }, (_, i) => i + 1);

  spacing = 20;
  originX = 50;
  originY = 100;

  allHoles = signal<Hole[]>([]);
  wires = signal<Wire[]>([]);
  components = signal<BreadboardComponent[]>([]);

  selectedWireColor = signal<string>('#2ed573');

  activeWireStartHole = signal<Hole | null>(null);
  mousePos = signal({ x: 0, y: 0 });

  draggingComponentType = signal<ComponentType | null>(null);

  dragPreview = signal<{
    visible: boolean;
    type: ComponentType | null;
    x: number;
    y: number;
  }>({
    visible: false,
    type: null,
    x: 0,
    y: 0,
  });

  selectedComponentId = signal<string | null>(null);

  shortCircuit = signal<{ active: boolean; message: string }>({
    active: false,
    message: '',
  });

  warningMessage = signal<string>('');

  private audioContext: AudioContext | null = null;
  private buzzerOscillator: OscillatorNode | null = null;
  private buzzerGain: GainNode | null = null;

  availableComponents: { type: ComponentType; label: string; color: string }[] = [
    { type: 'LED', label: 'LED', color: '#ff4757' },
    { type: 'RESISTOR', label: 'Rezistență', color: '#d2b48c' },
    { type: 'POTENTIOMETER', label: 'Potențiometru', color: '#34495e' },
    { type: 'BUTTON', label: 'Buton', color: '#ecf0f1' },
    { type: 'MULTIMETER', label: 'Multimetru', color: '#f1c40f' },
    { type: 'CAPACITOR', label: 'Condensator', color: '#1e5fa8' },
    { type: 'DIODE', label: 'Diodă', color: '#2f3542' },
    { type: 'SWITCH', label: 'Comutator', color: '#95a5a6' },
    { type: 'BUZZER', label: 'Buzzer', color: '#2f3542' },
    { type: 'TRANSISTOR_NPN', label: 'Tranzistor NPN', color: '#3d3d3d' },
    { type: 'TRANSISTOR_PNP', label: 'Tranzistor PNP', color: '#3d3d3d' },
    { type: 'INDUCTOR', label: 'Inductor', color: '#b9770e' },
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

  @HostListener('document:keydown.escape')
  onEscapePressed() {
    this.activeWireStartHole.set(null);
    this.onDragEnd();
    this.setWarning('Acțiune anulată.');
  }

  @HostListener('document:dragover', ['$event'])
  onDocumentDragOver(event: DragEvent) {
    if (!this.dragPreview().visible) return;

    this.dragPreview.update((prev) => ({
      ...prev,
      x: event.clientX,
      y: event.clientY,
    }));
  }

  @HostListener('document:drop')
  onDocumentDrop() {
    this.onDragEnd();
  }

  private startBuzzerSound() {
    if (this.buzzerOscillator) return;

    this.audioContext = this.audioContext || new AudioContext();

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    oscillator.type = 'square';
    oscillator.frequency.value = 1000;
    gain.gain.value = 0.03;

    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);

    oscillator.start();

    this.buzzerOscillator = oscillator;
    this.buzzerGain = gain;
  }

  private stopBuzzerSound() {
    if (this.buzzerOscillator) {
      this.buzzerOscillator.stop();
      this.buzzerOscillator.disconnect();
      this.buzzerOscillator = null;
    }

    if (this.buzzerGain) {
      this.buzzerGain.disconnect();
      this.buzzerGain = null;
    }
  }

  private setWarning(message: string) {
    this.warningMessage.set(message);

    setTimeout(() => {
      if (this.warningMessage() === message) {
        this.warningMessage.set('');
      }
    }, 2500);
  }

  private generateHoles() {
    const holes: Hole[] = [];

    this.cols.forEach((c) => {
      holes.push({
        id: `power-plus-top-${c}`,
        x: this.originX + c * this.spacing,
        y: this.originY - 60,
      });

      holes.push({
        id: `power-minus-top-${c}`,
        x: this.originX + c * this.spacing,
        y: this.originY - 40,
      });
    });

    this.rowsTop.forEach((r, rIdx) => {
      this.cols.forEach((c) => {
        holes.push({
          id: `row${r}-col${c}`,
          x: this.originX + c * this.spacing,
          y: this.originY + rIdx * this.spacing,
        });
      });
    });

    const bottomStartY = this.originY + this.rowsTop.length * this.spacing + 30;

    this.rowsBottom.forEach((r, rIdx) => {
      this.cols.forEach((c) => {
        holes.push({
          id: `row${r}-col${c}`,
          x: this.originX + c * this.spacing,
          y: bottomStartY + rIdx * this.spacing,
        });
      });
    });

    const powerBottomY = bottomStartY + this.rowsBottom.length * this.spacing + 20;

    this.cols.forEach((c) => {
      holes.push({
        id: `power-plus-bottom-${c}`,
        x: this.originX + c * this.spacing,
        y: powerBottomY,
      });

      holes.push({
        id: `power-minus-bottom-${c}`,
        x: this.originX + c * this.spacing,
        y: powerBottomY + 20,
      });
    });

    this.allHoles.set(holes);
  }

  getHoleById(id: string): Hole | undefined {
    return this.allHoles().find((h) => h.id === id);
  }

  getSelectedComponent(): BreadboardComponent | undefined {
    return this.components().find((c) => c.id === this.selectedComponentId());
  }

  selectComponent(id: string) {
    this.selectedComponentId.set(id);
  }

  updateComponentState(id: string, newState: any) {
    this.components.update((comps) =>
      comps.map((c) =>
        c.id === id
          ? {
              ...c,
              state: {
                ...c.state,
                ...newState,
              },
            }
          : c
      )
    );
  }

  deleteComponent(id: string) {
    this.components.update((comps) => comps.filter((c) => c.id !== id));

    if (this.selectedComponentId() === id) {
      this.selectedComponentId.set(null);
    }

    const hasBuzzer = this.components().some((c) => c.type === 'BUZZER');

    if (!hasBuzzer) {
      this.stopBuzzerSound();
    }
  }

  clearWires() {
    this.wires.set([]);
    this.activeWireStartHole.set(null);
    this.stopBuzzerSound();
  }

  clearBoard() {
    this.wires.set([]);
    this.components.set([]);
    this.selectedComponentId.set(null);
    this.activeWireStartHole.set(null);
    this.stopBuzzerSound();

    this.shortCircuit.set({
      active: false,
      message: '',
    });

    this.warningMessage.set('');
  }

  isHoleOccupied(holeId: string): boolean {
    const occupiedByComponent = this.components().some((comp) =>
      comp.pini.some((pin) => pin.holeId === holeId)
    );

    const occupiedByWire = this.wires().some(
      (wire) => wire.fromHoleId === holeId || wire.toHoleId === holeId
    );

    return occupiedByComponent || occupiedByWire;
  }

  getComponentAtHole(holeId: string): BreadboardComponent | undefined {
    return this.components().find((comp) =>
      comp.pini.some((pin) => pin.holeId === holeId)
    );
  }

  getWireAtHole(holeId: string): Wire | undefined {
    return this.wires().find(
      (wire) => wire.fromHoleId === holeId || wire.toHoleId === holeId
    );
  }

  canUseHoles(holeIds: string[]): boolean {
    return holeIds.every((holeId) => {
      const exists = !!this.getHoleById(holeId);
      const free = !this.isHoleOccupied(holeId);
      return exists && free;
    });
  }

  getPreviewPins(type: ComponentType | null): { x: number; y: number; label: string }[] {
    if (!type) return [];

    if (type === 'LED') {
      return [
        { x: 0, y: 40, label: 'A' },
        { x: 20, y: 40, label: 'K' },
      ];
    }

    if (type === 'RESISTOR') {
      return [
        { x: 0, y: 40, label: '1' },
        { x: 80, y: 40, label: '2' },
      ];
    }

    if (type === 'POTENTIOMETER') {
      return [
        { x: 0, y: 45, label: '1' },
        { x: 40, y: 45, label: '2' },
      ];
    }

    if (type === 'BUTTON') {
      return [
        { x: 0, y: 45, label: '1' },
        { x: 40, y: 45, label: '2' },
      ];
    }

    if (type === 'MULTIMETER') {
      return [
        { x: 0, y: 70, label: '+' },
        { x: 100, y: 70, label: '-' },
      ];
    }

    if (type === 'CAPACITOR') {
      return [
        { x: 0, y: 45, label: '1' },
        { x: 40, y: 45, label: '2' },
      ];
    }

    if (type === 'DIODE') {
      return [
        { x: 0, y: 45, label: 'A' },
        { x: 40, y: 45, label: 'K' },
      ];
    }

    if (type === 'SWITCH') {
      return [
        { x: 0, y: 45, label: '1' },
        { x: 40, y: 45, label: '2' },
      ];
    }

    if (type === 'BUZZER') {
      return [
        { x: 0, y: 45, label: '+' },
        { x: 40, y: 45, label: '-' },
      ];
    }

    if (type === 'INDUCTOR') {
      return [
        { x: 0, y: 45, label: '1' },
        { x: 80, y: 45, label: '2' },
      ];
    }

    if (type === 'TRANSISTOR_NPN') {
      return [
        { x: 0, y: 60, label: 'C' },
        { x: 20, y: 60, label: 'B' },
        { x: 40, y: 60, label: 'E' },
      ];
    }

    if (type === 'TRANSISTOR_PNP') {
      return [
        { x: 0, y: 60, label: 'E' },
        { x: 20, y: 60, label: 'B' },
        { x: 40, y: 60, label: 'C' },
      ];
    }

    return [];
  }

  getPreviewWidth(type: ComponentType | null): number {
    if (type === 'RESISTOR') return 115;
    if (type === 'MULTIMETER') return 145;
    if (type === 'LED') return 75;
    if (type === 'POTENTIOMETER') return 95;
    if (type === 'BUTTON') return 95;
    if (type === 'CAPACITOR') return 95;
    if (type === 'DIODE') return 95;
    if (type === 'SWITCH') return 95;
    if (type === 'BUZZER') return 95;
    if (type === 'INDUCTOR') return 120;
    if (type === 'TRANSISTOR_NPN') return 95;
    if (type === 'TRANSISTOR_PNP') return 95;

    return 90;
  }

  getPreviewLabel(type: ComponentType | null): string {
    const found = this.availableComponents.find((c) => c.type === type);
    return found ? found.label : '';
  }

  getPreviewColor(type: ComponentType | null): string {
    const found = this.availableComponents.find((c) => c.type === type);
    return found ? found.color : '#999';
  }

  onClickHole(hole: Hole, event?: MouseEvent) {
    event?.stopPropagation();

    const componentOnHole = this.getComponentAtHole(hole.id);

    if (componentOnHole) {
      this.selectComponent(componentOnHole.id);
      return;
    }

    const start = this.activeWireStartHole();

    if (!start) {
      const wireOnHole = this.getWireAtHole(hole.id);

      if (wireOnHole) {
        this.setWarning('Gaura este ocupată de un fir. Click dreapta pe fir pentru ștergere.');
        return;
      }

      this.activeWireStartHole.set(hole);
      this.mousePos.set({ x: hole.x, y: hole.y });
      return;
    }

    if (start.id === hole.id) {
      this.activeWireStartHole.set(null);
      return;
    }

    if (this.isHoleOccupied(hole.id)) {
      this.setWarning('Gaura este deja ocupată. Nu poți conecta firul aici.');
      this.activeWireStartHole.set(null);
      return;
    }

    this.wires.update((prev) => [
      ...prev,
      {
        id: `wire-${Date.now()}`,
        fromHoleId: start.id,
        toHoleId: hole.id,
        color: this.selectedWireColor(),
      },
    ]);

    this.activeWireStartHole.set(null);
  }

  onRightClickHole(event: MouseEvent, hole: Hole) {
    event.preventDefault();
    event.stopPropagation();

    const comp = this.getComponentAtHole(hole.id);

    if (comp) {
      this.deleteComponent(comp.id);
      return;
    }

    const wire = this.getWireAtHole(hole.id);

    if (wire) {
      this.wires.update((ws) => ws.filter((w) => w.id !== wire.id));
    }
  }

  onMouseMove(event: MouseEvent) {
    if (this.activeWireStartHole()) {
      const svg = (event.currentTarget as HTMLElement).getBoundingClientRect();

      this.mousePos.set({
        x: event.clientX - svg.left,
        y: event.clientY - svg.top,
      });
    }
  }

  onDragStart(type: ComponentType, event: DragEvent) {
    this.draggingComponentType.set(type);

    this.dragPreview.set({
      visible: true,
      type,
      x: event.clientX,
      y: event.clientY,
    });

    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', type);
      event.dataTransfer.effectAllowed = 'copy';

      const img = new Image();
      img.src =
        'data:image/svg+xml;charset=utf-8,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
        );

      event.dataTransfer.setDragImage(img, 0, 0);
    }
  }

  onDragEnd() {
    this.draggingComponentType.set(null);

    this.dragPreview.set({
      visible: false,
      type: null,
      x: 0,
      y: 0,
    });
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDropOnHole(hole: Hole, event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    const type = this.draggingComponentType();

    if (!type) return;

    const compId = `${type.toLowerCase()}-${Date.now()}`;
    let newComponent: BreadboardComponent | null = null;

    const getHoleByOffset = (startHoleId: string, colOffset: number): string | null => {
      const match = startHoleId.match(/row([A-J])-col(\d+)/);

      if (!match) return null;

      const row = match[1];
      const col = parseInt(match[2], 10) + colOffset;

      if (col < 1 || col > this.cols.length) return null;

      return `row${row}-col${col}`;
    };

    if (type === 'LED') {
      const cathodeHoleId = getHoleByOffset(hole.id, 1);

      if (cathodeHoleId) {
        newComponent = {
          id: compId,
          type: 'LED',
          state: {
            isOn: false,
            isBurnt: false,
            current: 0,
            color: '#ff4757',
          },
          pini: [
            { id: 'anode', holeId: hole.id, relativeX: 0, relativeY: 0 },
            { id: 'cathode', holeId: cathodeHoleId, relativeX: 20, relativeY: 0 },
          ],
        };
      }
    }

    if (type === 'RESISTOR') {
      const pin2 = getHoleByOffset(hole.id, 4);

      if (pin2) {
        newComponent = {
          id: compId,
          type: 'RESISTOR',
          state: {
            ohms: 1000,
          },
          pini: [
            { id: 'p1', holeId: hole.id, relativeX: 0, relativeY: 0 },
            { id: 'p2', holeId: pin2, relativeX: 80, relativeY: 0 },
          ],
        };
      }
    }

    if (type === 'POTENTIOMETER') {
      const pin2 = getHoleByOffset(hole.id, 2);

      if (pin2) {
        newComponent = {
          id: compId,
          type: 'POTENTIOMETER',
          state: {
            maxOhms: 10000,
            value: 5000,
          },
          pini: [
            { id: 'p1', holeId: hole.id, relativeX: 0, relativeY: 0 },
            { id: 'p2', holeId: pin2, relativeX: 40, relativeY: 0 },
          ],
        };
      }
    }

    if (type === 'BUTTON') {
      const pin2 = getHoleByOffset(hole.id, 2);

      if (pin2) {
        newComponent = {
          id: compId,
          type: 'BUTTON',
          state: {
            isPressed: false,
          },
          pini: [
            { id: 'p1', holeId: hole.id, relativeX: 0, relativeY: 0 },
            { id: 'p2', holeId: pin2, relativeX: 40, relativeY: 0 },
          ],
        };
      }
    }

    if (type === 'MULTIMETER') {
      const pin2 = getHoleByOffset(hole.id, 5);

      if (pin2) {
        newComponent = {
          id: compId,
          type: 'MULTIMETER',
          state: {
            readingV: 0,
          },
          pini: [
            { id: 'vcc', holeId: hole.id, relativeX: 0, relativeY: 0 },
            { id: 'gnd', holeId: pin2, relativeX: 100, relativeY: 0 },
          ],
        };
      }
    }

    if (type === 'CAPACITOR') {
      const pin2 = getHoleByOffset(hole.id, 2);

      if (pin2) {
        newComponent = {
          id: compId,
          type: 'CAPACITOR',
          state: {
            capacitance: 100,
          },
          pini: [
            { id: 'p1', holeId: hole.id, relativeX: 0, relativeY: 0 },
            { id: 'p2', holeId: pin2, relativeX: 40, relativeY: 0 },
          ],
        };
      }
    }

    if (type === 'DIODE') {
      const pin2 = getHoleByOffset(hole.id, 2);

      if (pin2) {
        newComponent = {
          id: compId,
          type: 'DIODE',
          state: {},
          pini: [
            { id: 'anode', holeId: hole.id, relativeX: 0, relativeY: 0 },
            { id: 'cathode', holeId: pin2, relativeX: 40, relativeY: 0 },
          ],
        };
      }
    }

    if (type === 'SWITCH') {
      const pin2 = getHoleByOffset(hole.id, 2);

      if (pin2) {
        newComponent = {
          id: compId,
          type: 'SWITCH',
          state: {
            isOn: false,
          },
          pini: [
            { id: 'p1', holeId: hole.id, relativeX: 0, relativeY: 0 },
            { id: 'p2', holeId: pin2, relativeX: 40, relativeY: 0 },
          ],
        };
      }
    }

    if (type === 'BUZZER') {
      const pin2 = getHoleByOffset(hole.id, 2);

      if (pin2) {
        newComponent = {
          id: compId,
          type: 'BUZZER',
          state: {
            active: false,
          },
          pini: [
            { id: 'plus', holeId: hole.id, relativeX: 0, relativeY: 0 },
            { id: 'minus', holeId: pin2, relativeX: 40, relativeY: 0 },
          ],
        };
      }
    }

    if (type === 'INDUCTOR') {
      const pin2 = getHoleByOffset(hole.id, 4);

      if (pin2) {
        newComponent = {
          id: compId,
          type: 'INDUCTOR',
          state: {
            inductance: 10,
          },
          pini: [
            { id: 'p1', holeId: hole.id, relativeX: 0, relativeY: 0 },
            { id: 'p2', holeId: pin2, relativeX: 80, relativeY: 0 },
          ],
        };
      }
    }

    if (type === 'TRANSISTOR_NPN') {
      const pin2 = getHoleByOffset(hole.id, 1);
      const pin3 = getHoleByOffset(hole.id, 2);

      if (pin2 && pin3) {
        newComponent = {
          id: compId,
          type: 'TRANSISTOR_NPN',
          state: {},
          pini: [
            { id: 'C', holeId: hole.id, relativeX: 0, relativeY: 0 },
            { id: 'B', holeId: pin2, relativeX: 20, relativeY: 0 },
            { id: 'E', holeId: pin3, relativeX: 40, relativeY: 0 },
          ],
        };
      }
    }

    if (type === 'TRANSISTOR_PNP') {
      const pin2 = getHoleByOffset(hole.id, 1);
      const pin3 = getHoleByOffset(hole.id, 2);

      if (pin2 && pin3) {
        newComponent = {
          id: compId,
          type: 'TRANSISTOR_PNP',
          state: {},
          pini: [
            { id: 'E', holeId: hole.id, relativeX: 0, relativeY: 0 },
            { id: 'B', holeId: pin2, relativeX: 20, relativeY: 0 },
            { id: 'C', holeId: pin3, relativeX: 40, relativeY: 0 },
          ],
        };
      }
    }

    if (!newComponent) {
      this.setWarning(
        'Componenta poate fi plasată doar pe grila principală A-J, nu direct pe șinele de alimentare.'
      );
      this.onDragEnd();
      return;
    }

    const pinHoleIds = newComponent.pini.map((pin) => pin.holeId);

    if (!this.canUseHoles(pinHoleIds)) {
      this.setWarning('Nu poți plasa piesa aici. Una sau mai multe găuri sunt deja ocupate.');
      this.onDragEnd();
      return;
    }

    this.components.update((comps) => [...comps, newComponent!]);
    this.selectComponent(compId);
    this.onDragEnd();
  }

  onRightClickComponent(event: MouseEvent, compId: string) {
    event.preventDefault();
    event.stopPropagation();
    this.deleteComponent(compId);
  }

  onRightClickWire(event: MouseEvent, wireId: string) {
    event.preventDefault();
    event.stopPropagation();
    this.wires.update((ws) => ws.filter((w) => w.id !== wireId));
  }

  private runNumericalSimulation() {
    const VCC_VOLTAGE = 9.0;

    const connections = new Map<string, string[]>();

    const addConnection = (a: string, b: string) => {
      if (!connections.has(a)) connections.set(a, []);
      if (!connections.has(b)) connections.set(b, []);

      connections.get(a)!.push(b);
      connections.get(b)!.push(a);
    };

   this.cols.forEach((c) => {
  const topColumnHoles = this.rowsTop.map((r) => `row${r}-col${c}`);
  const bottomColumnHoles = this.rowsBottom.map((r) => `row${r}-col${c}`);

  for (let i = 0; i < topColumnHoles.length; i++) {
    for (let j = i + 1; j < topColumnHoles.length; j++) {
      addConnection(topColumnHoles[i], topColumnHoles[j]);
    }
  }

  for (let i = 0; i < bottomColumnHoles.length; i++) {
    for (let j = i + 1; j < bottomColumnHoles.length; j++) {
      addConnection(bottomColumnHoles[i], bottomColumnHoles[j]);
    }
  }
});

    this.cols.forEach((c) => {
      if (c > 1) {
        addConnection(`power-plus-top-${c - 1}`, `power-plus-top-${c}`);
        addConnection(`power-minus-top-${c - 1}`, `power-minus-top-${c}`);
        addConnection(`power-plus-bottom-${c - 1}`, `power-plus-bottom-${c}`);
        addConnection(`power-minus-bottom-${c - 1}`, `power-minus-bottom-${c}`);
      }
    });

    this.wires().forEach((w) => addConnection(w.fromHoleId, w.toHoleId));

    this.components().forEach((comp) => {
      if (comp.type === 'BUTTON' && comp.state.isPressed) {
        const p1 = comp.pini[0]?.holeId;
        const p2 = comp.pini[1]?.holeId;

        if (p1 && p2) {
          addConnection(p1, p2);
        }
      }

      if (comp.type === 'SWITCH' && comp.state.isOn) {
        const p1 = comp.pini[0]?.holeId;
        const p2 = comp.pini[1]?.holeId;

        if (p1 && p2) {
          addConnection(p1, p2);
        }
      }
    });

    const getElectricalNode = (startHole: string): Set<string> => {
      const visited = new Set<string>();
      const queue = [startHole];

      visited.add(startHole);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const neighbors = connections.get(current) || [];

        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      return visited;
    };

    const detectDirectShortCircuit = (): boolean => {
      const visitedGlobal = new Set<string>();

      for (const hole of this.allHoles()) {
        if (visitedGlobal.has(hole.id)) continue;

        const node = getElectricalNode(hole.id);
        node.forEach((h) => visitedGlobal.add(h));

        const hasVcc = Array.from(node).some((h) => h.includes('power-plus'));
        const hasGnd = Array.from(node).some((h) => h.includes('power-minus'));

        if (hasVcc && hasGnd) {
          return true;
        }
      }

      return false;
    };

    const hasShortCircuit = detectDirectShortCircuit();

    if (hasShortCircuit) {
      this.shortCircuit.set({
        active: true,
        message: '⚠️ Scurtcircuit detectat! Plusul este conectat direct la minus.',
      });
    } else {
      this.shortCircuit.set({
        active: false,
        message: '',
      });
    }

    let simulationChanged = false;
    let anyBuzzerActive = false;
    const comps = this.components();

    const updatedComponents = comps.map((comp) => {
      if (comp.type === 'LED') {
        if (comp.state.isBurnt) return comp;

        const anodeHole = comp.pini.find((p) => p.id === 'anode')?.holeId;
        const cathodeHole = comp.pini.find((p) => p.id === 'cathode')?.holeId;

        if (!anodeHole || !cathodeHole) return comp;

        const calculatePathResistance = (
          startHole: string,
          targetType: 'VCC' | 'GND'
        ): number | null => {
          const currentNodes = getElectricalNode(startHole);

          const isAtSource = Array.from(currentNodes).some((h) =>
            targetType === 'VCC' ? h.includes('power-plus') : h.includes('power-minus')
          );

          if (isAtSource) return 0;

          for (const c of comps) {
            if (
              c.type === 'RESISTOR' ||
              c.type === 'POTENTIOMETER' ||
              c.type === 'BUTTON' ||
              c.type === 'SWITCH'
            ) {
              const p1 = c.pini[0].holeId;
              const p2 = c.pini[1].holeId;

              if (currentNodes.has(p1) || currentNodes.has(p2)) {
                let compResistance = 0;

                if (c.type === 'RESISTOR') {
                  compResistance = Number(c.state.ohms);
                }

                if (c.type === 'POTENTIOMETER') {
                  compResistance = Number(c.state.value);
                }

                if (c.type === 'BUTTON') {
                  if (!c.state.isPressed) continue;
                  compResistance = 0;
                }

                if (c.type === 'SWITCH') {
                  if (!c.state.isOn) continue;
                  compResistance = 0;
                }

                const nextHole = currentNodes.has(p1) ? p2 : p1;
                const nextNodes = getElectricalNode(nextHole);

                const reachesSource = Array.from(nextNodes).some((h) =>
                  targetType === 'VCC'
                    ? h.includes('power-plus')
                    : h.includes('power-minus')
                );

                if (reachesSource) {
                  return compResistance;
                }
              }
            }
          }

          return null;
        };

        const rToVcc = calculatePathResistance(anodeHole, 'VCC');
        const rToGnd = calculatePathResistance(cathodeHole, 'GND');

        let isBurnt = false;
        let isOn = false;
        let current = 0;

        if (!hasShortCircuit && rToVcc !== null && rToGnd !== null) {
          const totalResistance = rToVcc + rToGnd;

          if (totalResistance < 150) {
            isBurnt = true;
          } else {
            current = VCC_VOLTAGE / totalResistance;

            if (current > 0.001) {
              isOn = true;
            }
          }
        }

        if (
          comp.state.isOn !== isOn ||
          comp.state.isBurnt !== isBurnt ||
          comp.state.current !== current
        ) {
          simulationChanged = true;

          return {
            ...comp,
            state: {
              ...comp.state,
              isOn,
              isBurnt,
              current,
            },
          };
        }
      }

      if (comp.type === 'MULTIMETER') {
        const vccNode = getElectricalNode(comp.pini[0].holeId);
        const gndNode = getElectricalNode(comp.pini[1].holeId);

        const readsVcc = Array.from(vccNode).some((h) => h.includes('power-plus'));
        const readsGnd = Array.from(gndNode).some((h) => h.includes('power-minus'));

        const readingV = !hasShortCircuit && readsVcc && readsGnd ? VCC_VOLTAGE : 0;

        if (comp.state.readingV !== readingV) {
          simulationChanged = true;

          return {
            ...comp,
            state: {
              ...comp.state,
              readingV,
            },
          };
        }
      }

      if (comp.type === 'BUZZER') {
        const plusHole = comp.pini.find((p) => p.id === 'plus')?.holeId;
        const minusHole = comp.pini.find((p) => p.id === 'minus')?.holeId;

        if (!plusHole || !minusHole) return comp;

        const plusNode = getElectricalNode(plusHole);
        const minusNode = getElectricalNode(minusHole);

        const hasPlus = Array.from(plusNode).some((h) => h.includes('power-plus'));
        const hasMinus = Array.from(minusNode).some((h) => h.includes('power-minus'));

        const active = !hasShortCircuit && hasPlus && hasMinus;

        if (active) {
          anyBuzzerActive = true;
        }

        if (comp.state.active !== active) {
          simulationChanged = true;

          return {
            ...comp,
            state: {
              ...comp.state,
              active,
            },
          };
        }
      }

      return comp;
    });

    if (anyBuzzerActive) {
      this.startBuzzerSound();
    } else {
      this.stopBuzzerSound();
    }

    if (simulationChanged) {
      this.components.set(updatedComponents);
    }
  }

  getWirePath(
    w: Wire | null,
    startHole?: Hole | null,
    endPos?: { x: number; y: number }
  ): string {
    let startX: number;
    let startY: number;
    let endX: number;
    let endY: number;

    if (w) {
      const start = this.getHoleById(w.fromHoleId);
      const end = this.getHoleById(w.toHoleId);

      if (!start || !end) return '';

      startX = start.x;
      startY = start.y;
      endX = end.x;
      endY = end.y;
    } else if (startHole && endPos) {
      startX = startHole.x;
      startY = startHole.y;
      endX = endPos.x;
      endY = endPos.y;
    } else {
      return '';
    }

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const dist = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const sag = dist * 0.25;

    return `M ${startX} ${startY} Q ${midX} ${midY + sag} ${endX} ${endY}`;
  }

  exportAsSVG() {
    if (!this.svgElement) return;

    const originalSvg = this.svgElement.nativeElement;
    const clonedSvg = originalSvg.cloneNode(true) as SVGSVGElement;

    clonedSvg.querySelectorAll('.interactive-holes-layer').forEach((el) => {
      el.remove();
    });

    clonedSvg.querySelectorAll('.button-control-layer').forEach((el) => {
      el.remove();
    });

    clonedSvg.querySelectorAll('.switch-control-layer').forEach((el) => {
      el.remove();
    });

    clonedSvg.querySelectorAll('.selected-export-remove').forEach((el) => {
      el.remove();
    });

    clonedSvg.querySelectorAll('title').forEach((el) => {
      el.remove();
    });

    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('width', '1400');
    clonedSvg.setAttribute('height', '500');

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(clonedSvg);

    if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const blob = new Blob([source], {
      type: 'image/svg+xml;charset=utf-8',
    });

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