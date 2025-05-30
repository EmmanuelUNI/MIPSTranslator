import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TranslatorService } from '../Translator/translator.service';
import { FormInputManagerService } from '../FormInputManager/form-input-manager.service';

@Injectable({
  providedIn: 'root',
})
export class TableInstructionService {
  converter = inject(TranslatorService);
  private selectedLineTextSubject = new BehaviorSubject<string>('');
  isHexToMips = inject(FormInputManagerService).isHexToMips;
  selectedLineText$ = this.selectedLineTextSubject.asObservable();
  selectedLineText = '';

  updateSelectedLineText(newText: string): void {
    this.selectedLineTextSubject.next(newText);
  }

  textContent = '';

  constructor() {}

  convertRegisterToName(registerBinary: string) {
    const regMap: { [key: string]: string } = {
      '00000': 'zero',
      '00001': 'at',
      '00010': 'v0',
      '00011': 'v1',
      '00100': 'a0',
      '00101': 'a1',
      '00110': 'a2',
      '00111': 'a3',
      '01000': 't0',
      '01001': 't1',
      '01010': 't2',
      '01011': 't3',
      '01100': 't4',
      '01101': 't5',
      '01110': 't6',
      '01111': 't7',
      '10000': 's0',
      '10001': 's1',
      '10010': 's2',
      '10011': 's3',
      '10100': 's4',
      '10101': 's5',
      '10110': 's6',
      '10111': 's7',
      '11000': 't8',
      '11001': 't9',
      '11010': 'k0',
      '11011': 'k1',
      '11100': 'gp',
      '11101': 'sp',
      '11110': 'fp',
      '11111': 'ra',
    };
    return regMap[registerBinary] || 'unknown';
  }

  explainInstruction() {
    this.selectedLineText$.subscribe((text) => {
      if(!this.isHexToMips.value){
        text = this.converter.translateMIPStoHex(text);
      }
      this.selectedLineText = text;
    });
    const instruction = this.selectedLineText.trim();
    return this.generateInstructionTable(instruction.trim());
  }

  produceRInstruction(instruction: string) {
    const binaryInstruction: string = this.converter.hexToBinary(
      this.selectedLineText
    );
    return {
      opcode: binaryInstruction.slice(0, 6),
      rs: binaryInstruction.slice(6, 11),
      rt: binaryInstruction.slice(11, 16),
      rd: binaryInstruction.slice(16, 21),
      shamt: binaryInstruction.slice(21, 26),
      funct: binaryInstruction.slice(26, 32),
    };
  }

  produceIInstruction(instruction: string) {
    const binaryInstruction: string = this.converter.hexToBinary(instruction);
    const opcode = binaryInstruction.slice(0, 6);
    
    if (opcode === '000001') {
      return {
        opcode: opcode,
        rs: binaryInstruction.slice(6, 11),
        rt: binaryInstruction.slice(11, 16),
        immediate: binaryInstruction.slice(16, 32)
      };
    }
    
    return {
      opcode: opcode,
      rs: binaryInstruction.slice(6, 11),
      rt: binaryInstruction.slice(11, 16),
      immediate: binaryInstruction.slice(16, 32),
    };
  }

  produceJInstruction(instruction: string): { opcode: string; address: string } {
    const binaryInstruction: string = this.converter.hexToBinary(
      this.selectedLineText
    );
    return {
      opcode: binaryInstruction.slice(0, 6),
      address: binaryInstruction.slice(6, 32),
    };
  }

  produceRTrapInstruction(instruction: string) {
    const binaryInstruction: string = this.converter.hexToBinary(this.selectedLineText);

    return {
      opcode: binaryInstruction.slice(0, 6),
      rs: binaryInstruction.slice(6, 11),
      rt: binaryInstruction.slice(11, 16),
      code: binaryInstruction.slice(16, 26),
      funct: binaryInstruction.slice(26, 32),
    };
  }

  produceITrapInstruction(instruction: string) {
    const binaryInstruction: string = this.converter.hexToBinary(instruction);

    const rtMap: { [key: string]: string } = {
      "01000": "tgei",
      "01001": "tgeiu",
      "01010": "tlti",
      "01011": "tltiu",
      "01100": "teqi",
      "01110": "tnei"
    };

    const rtBinary = binaryInstruction.slice(11, 16);
    const rtName = rtMap[rtBinary];

    return {
      opcode: binaryInstruction.slice(0, 6),
      rs: binaryInstruction.slice(6, 11),
      rtBinary: rtBinary,
      rtName: rtName,
      immediate: binaryInstruction.slice(16, 32),
    };
  }

  produceSpecialInstruction(instruction: string) {
    const binaryInstruction: string = this.converter.hexToBinary(instruction);
    const opcode = binaryInstruction.slice(0, 6);
    
    // Handle coprocessor instructions (COP0, COP1, etc.)
    if (opcode === '010000') { // COP0
      return {
        opcode: opcode,
        rs: binaryInstruction.slice(6, 11),
        rt: binaryInstruction.slice(11, 16),
        rd: binaryInstruction.slice(16, 21),
        funct: binaryInstruction.slice(26, 32),
        coprocessor: '0'
      };
    }
    else if (opcode === '010001') { // COP1 (floating point)
      return {
        opcode: opcode,
        fmt: binaryInstruction.slice(6, 11),
        ft: binaryInstruction.slice(11, 16),
        fs: binaryInstruction.slice(16, 21),
        fd: binaryInstruction.slice(21, 26),
        funct: binaryInstruction.slice(26, 32),
        coprocessor: '1'
      };
    }
    else if (opcode === '010010') { // COP2
      return {
        opcode: opcode,
        coprocessor: '2',
        rs: binaryInstruction.slice(6, 11),
        rt: binaryInstruction.slice(11, 16),
        rd: binaryInstruction.slice(16, 21),
        funct: binaryInstruction.slice(26, 32)
      };
    }
    
    // Handle other special instructions
    return {
      opcode: opcode,
      binary: binaryInstruction,
      instruction: 'Special instruction'
    };
  }

  generateInstructionTable(instruction: string) {
    const binaryInstruction: string = this.converter.hexToBinary(
      this.selectedLineText
    );
    const opCode: string = binaryInstruction.slice(0, 6);

    // R-Type instructions
    if (opCode === '000000') {
      const funct = binaryInstruction.slice(26, 32);
      // Check for trap instructions
      if (['110000', '110001', '110010', '110011', '110100', '110110'].includes(funct)) {
        return { type: 'R-Trap', data: this.produceRTrapInstruction(instruction) };
      }
      return { type: 'R', data: this.produceRInstruction(instruction) };
    }
    
    // I-Type instructions
    const iTypeOpcodes = [
      '001000', '001001', '001100', '001101', '001110',
      '100011', '101011', '100000', '100100', '100001',
      '100101', '101000', '101001', '000100', '000101',
      '000110', '000111', '001111', '001010', '001011',
      '000001', '100010', '100110', '101010', '101110',
      '110111', '111111'
    ];
    
    if (iTypeOpcodes.includes(opCode)) {
      // Special case for trap immediate instructions
      if (opCode === '000001' && ['01000', '01001', '01010', '01011', '01100', '01110'].includes(binaryInstruction.slice(11, 16))) {
        return { type: 'I-Trap', data: this.produceITrapInstruction(instruction) };
      }
      return { type: 'I', data: this.produceIInstruction(instruction) };
    }
    
    // J-Type instructions
    if (['000010', '000011'].includes(opCode)) {
      return { type: 'J', data: this.produceJInstruction(instruction) };
    }
    
    // Special instructions (coprocessor, floating point, etc.)
    if (['010000', '010001', '010010', '010011'].includes(opCode)) {
      return { type: 'Special', data: this.produceSpecialInstruction(instruction) };
    }

    return { type: 'unknown', data: 'Unknown instruction', opCode: opCode };
  }

  decodeInstruction(instruction: string) {
    let explanation = '';
    let details: any = {};

    const parts = instruction.split(/\s+/);
    const operation = parts[0].toLowerCase();
    
    switch (operation) {
      // R-Type instructions
      case 'add': case 'sub': case 'and': case 'or': case 'xor': case 'nor':
      case 'slt': case 'sltu': case 'addu': case 'subu': case 'sll': case 'srl':
      case 'sra': case 'sllv': case 'srlv': case 'srav': case 'div': case 'divu':
      case 'mult': case 'multu': case 'mfhi': case 'mflo': case 'mthi': case 'mtlo':
      case 'jr': case 'jalr': case 'syscall': case 'break': case 'teq': case 'tge':
      case 'tgeu': case 'tlt': case 'tltu': case 'tne': case 'rol': case 'ror':
      case 'mul': case 'mulo': case 'mulou': case 'rem': case 'remu':
        details = {
          operation: operation,
          rs: parts.length > 2 ? parts[2] : undefined,
          rt: parts.length > 3 ? parts[3] : undefined,
          rd: parts.length > 1 ? parts[1] : undefined,
          shamt: operation.match(/sll|srl|sra/) ? parts[3] : '0',
          funct: this.converter.getFunctCode(operation),
        };
        explanation = this.getRTypeExplanation(operation, details);
        break;

      // I-Type instructions
      case 'addi': case 'addiu': case 'andi': case 'ori': case 'xori': 
      case 'slti': case 'sltiu':
        details = {
          operation: operation,
          rt: parts[1],
          rs: parts[2],
          immediate: parts[3],
        };
        explanation = this.getITypeArithmeticExplanation(operation, details);
        break;

      case 'lw': case 'sw': case 'lb': case 'lbu': case 'lh': case 'lhu':
      case 'sb': case 'sh': case 'lwl': case 'lwr': case 'swl': case 'swr':
      case 'ld': case 'sd':
        details = {
          operation: operation,
          rt: parts[1],
          offset: parts[2].split('(')[0],
          rs: parts[2].split('(')[1].replace(')', ''),
        };
        explanation = this.getMemoryExplanation(operation, details);
        break;

      case 'beq': case 'bne': case 'blez': case 'bgtz': case 'bltz': 
      case 'bgez': case 'bltzal': case 'bgezal':
        details = {
          operation: operation,
          rs: parts[1],
          rt: operation === 'beq' || operation === 'bne' ? parts[2] : undefined,
          offset: operation === 'beq' || operation === 'bne' ? parts[3] : parts[2],
        };
        explanation = this.getBranchExplanation(operation, details);
        break;

      case 'lui':
        details = {
          operation: operation,
          rt: parts[1],
          immediate: parts[2],
        };
        explanation = `Load upper immediate: ${details.rt} = ${details.immediate} << 16`;
        break;

      case 'la':
        details = {
          operation: operation,
          rt: parts[1],
          address: parts[2],
        };
        explanation = `Load address: ${details.rt} = address of ${details.address}`;
        break;

      case 'li':
        details = {
          operation: operation,
          rt: parts[1],
          immediate: parts[2],
        };
        explanation = `Load immediate: ${details.rt} = ${details.immediate}`;
        break;

      case 'move':
        details = {
          operation: operation,
          rd: parts[1],
          rs: parts[2],
        };
        explanation = `Move: ${details.rd} = ${details.rs}`;
        break;

      case 'not':
        details = {
          operation: operation,
          rd: parts[1],
          rs: parts[2],
        };
        explanation = `Bitwise NOT: ${details.rd} = ~${details.rs}`;
        break;

      case 'neg': case 'negu':
        details = {
          operation: operation,
          rd: parts[1],
          rs: parts[2],
        };
        explanation = `Negate${operation === 'negu' ? ' unsigned' : ''}: ${details.rd} = -${details.rs}`;
        break;

      case 'j': case 'jal':
        details = {
          operation: operation,
          address: parts[1],
        };
        explanation = operation === 'j' 
          ? `Jump to address ${details.address}` 
          : `Jump and link: store return address in $ra and jump to ${details.address}`;
        break;

      case 'nop':
        explanation = `No operation: does nothing`;
        break;

      case 'rfe':
        explanation = `Return from exception: restores status after exception`;
        break;

      // Special instructions (coprocessor, floating point)
      case 'mfc0': case 'mtc0': case 'mfc1': case 'mtc1': case 'mfc2': case 'mtc2':
        details = {
          operation: operation,
          rt: parts[1],
          rd: parts[2],
          coprocessor: operation.slice(-1)
        };
        explanation = `${operation}: Move ${details.rt} ${operation.startsWith('mf') ? 'from' : 'to'} coprocessor ${details.coprocessor} register ${details.rd}`;
        break;

      case 'cvt.s.w': case 'cvt.d.w': case 'cvt.w.s': case 'cvt.w.d':
        details = {
          operation: operation,
          fd: parts[1],
          fs: parts[2]
        };
        explanation = `Convert ${details.fs} from ${operation.split('.')[1]} to ${operation.split('.')[2]} format, store in ${details.fd}`;
        break;

      case 'add.s': case 'sub.s': case 'mul.s': case 'div.s':
      case 'add.d': case 'sub.d': case 'mul.d': case 'div.d':
        details = {
          operation: operation,
          fd: parts[1],
          fs: parts[2],
          ft: parts[3],
          precision: operation.split('.')[1] === 's' ? 'single' : 'double'
        };
        explanation = `Floating point ${operation.split('.')[0]} (${details.precision} precision): ${details.fd} = ${details.fs} ${operation.split('.')[0]} ${details.ft}`;
        break;

      default:
        explanation = `Unknown instruction: ${operation}`;
    }
    return explanation;
  }

  private getRTypeExplanation(op: string, details: any): string {
    const explanations: {[key: string]: string} = {
      'add': `${details.rd} = ${details.rs} + ${details.rt} (with overflow check)`,
      'addu': `${details.rd} = ${details.rs} + ${details.rt} (no overflow check)`,
      'sub': `${details.rd} = ${details.rs} - ${details.rt} (with overflow check)`,
      'subu': `${details.rd} = ${details.rs} - ${details.rt} (no overflow check)`,
      'and': `${details.rd} = ${details.rs} & ${details.rt} (bitwise AND)`,
      'or': `${details.rd} = ${details.rs} | ${details.rt} (bitwise OR)`,
      'xor': `${details.rd} = ${details.rs} ^ ${details.rt} (bitwise XOR)`,
      'nor': `${details.rd} = ~(${details.rs} | ${details.rt}) (bitwise NOR)`,
      'slt': `${details.rd} = (${details.rs} < ${details.rt}) ? 1 : 0 (signed comparison)`,
      'sltu': `${details.rd} = (${details.rs} < ${details.rt}) ? 1 : 0 (unsigned comparison)`,
      'sll': `${details.rd} = ${details.rt} << ${details.shamt} (shift left logical)`,
      'srl': `${details.rd} = ${details.rt} >> ${details.shamt} (shift right logical)`,
      'sra': `${details.rd} = ${details.rt} >> ${details.shamt} (shift right arithmetic)`,
      'sllv': `${details.rd} = ${details.rt} << ${details.rs} (shift left logical variable)`,
      'srlv': `${details.rd} = ${details.rt} >> ${details.rs} (shift right logical variable)`,
      'srav': `${details.rd} = ${details.rt} >> ${details.rs} (shift right arithmetic variable)`,
      'div': `Divide ${details.rs} by ${details.rt} (signed), store quotient in LO and remainder in HI`,
      'divu': `Divide ${details.rs} by ${details.rt} (unsigned), store quotient in LO and remainder in HI`,
      'mult': `Multiply ${details.rs} by ${details.rt} (signed), store 64-bit result in HI:LO`,
      'multu': `Multiply ${details.rs} by ${details.rt} (unsigned), store 64-bit result in HI:LO`,
      'mfhi': `${details.rd} = HI (move from HI register)`,
      'mflo': `${details.rd} = LO (move from LO register)`,
      'mthi': `HI = ${details.rs} (move to HI register)`,
      'mtlo': `LO = ${details.rs} (move to LO register)`,
      'jr': `Jump to address in ${details.rs}`,
      'jalr': `Jump to address in ${details.rs} and store return address in ${details.rd || '$ra'}`,
      'syscall': `System call (invoke operating system service)`,
      'break': `Breakpoint (generate exception)`,
      'teq': `Trap if ${details.rs} == ${details.rt}`,
      'tge': `Trap if ${details.rs} >= ${details.rt} (signed)`,
      'tgeu': `Trap if ${details.rs} >= ${details.rt} (unsigned)`,
      'tlt': `Trap if ${details.rs} < ${details.rt} (signed)`,
      'tltu': `Trap if ${details.rs} < ${details.rt} (unsigned)`,
      'tne': `Trap if ${details.rs} != ${details.rt}`,
      'rol': `${details.rd} = ${details.rt} rotated left by ${details.rs} bits`,
      'ror': `${details.rd} = ${details.rt} rotated right by ${details.rs} bits`,
      'mul': `${details.rd} = ${details.rs} * ${details.rt} (signed, low 32 bits)`,
      'mulo': `${details.rd} = ${details.rs} * ${details.rt} (signed, with overflow check)`,
      'mulou': `${details.rd} = ${details.rs} * ${details.rt} (unsigned, with overflow check)`,
      'rem': `${details.rd} = ${details.rs} % ${details.rt} (signed remainder)`,
      'remu': `${details.rd} = ${details.rs} % ${details.rt} (unsigned remainder)`,
    };

    return explanations[op] || `R-type instruction: ${op} operation`;
  }

  private getITypeArithmeticExplanation(op: string, details: any): string {
    const explanations: {[key: string]: string} = {
      'addi': `${details.rt} = ${details.rs} + ${details.immediate} (signed with overflow check)`,
      'addiu': `${details.rt} = ${details.rs} + ${details.immediate} (signed without overflow check)`,
      'andi': `${details.rt} = ${details.rs} & ${details.immediate} (bitwise AND)`,
      'ori': `${details.rt} = ${details.rs} | ${details.immediate} (bitwise OR)`,
      'xori': `${details.rt} = ${details.rs} ^ ${details.immediate} (bitwise XOR)`,
      'slti': `${details.rt} = (${details.rs} < ${details.immediate}) ? 1 : 0 (signed comparison)`,
      'sltiu': `${details.rt} = (${details.rs} < ${details.immediate}) ? 1 : 0 (unsigned comparison)`,
    };

    return explanations[op] || `I-type arithmetic instruction: ${op} operation`;
  }

  private getMemoryExplanation(op: string, details: any): string {
    const loadStore = op.startsWith('l') ? 'Load' : 'Store';
    const sizeMap: {[key: string]: string} = {
      'b': 'byte',
      'h': 'halfword',
      'w': 'word',
      'd': 'doubleword',
      'l': 'left word',
      'r': 'right word'
    };
    
    const size = sizeMap[op.charAt(1)] || 'word';
    const signed = op.endsWith('u') ? ' unsigned' : '';
    
    return `${loadStore} ${size}${signed}: ${op} ${details.rt}, ${details.offset}(${details.rs})`;
  }

  private getBranchExplanation(op: string, details: any): string {
    const explanations: {[key: string]: string} = {
      'beq': `Branch to PC + 4 + (${details.offset} << 2) if ${details.rs} == ${details.rt}`,
      'bne': `Branch to PC + 4 + (${details.offset} << 2) if ${details.rs} != ${details.rt}`,
      'blez': `Branch to PC + 4 + (${details.offset} << 2) if ${details.rs} <= 0`,
      'bgtz': `Branch to PC + 4 + (${details.offset} << 2) if ${details.rs} > 0`,
      'bltz': `Branch to PC + 4 + (${details.offset} << 2) if ${details.rs} < 0`,
      'bgez': `Branch to PC + 4 + (${details.offset} << 2) if ${details.rs} >= 0`,
      'bltzal': `Branch to PC + 4 + (${details.offset} << 2) if ${details.rs} < 0 and store return address in $ra`,
      'bgezal': `Branch to PC + 4 + (${details.offset} << 2) if ${details.rs} >= 0 and store return address in $ra`,
    };

    return explanations[op] || `Branch instruction: ${op} operation`;
  }
}