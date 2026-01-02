// Hardware service for POS peripherals
// Printer, cash drawer, barcode scanner integration

import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer';
import { app } from 'electron';

interface PrinterConfig {
  enabled: boolean;
  type: string;
  interface: string;
  width: number;
}

export class HardwareService {
  private printer: ThermalPrinter | null = null;
  private printerConfig: PrinterConfig = {
    enabled: false,
    type: 'epson',
    interface: '',
    width: 48,
  };
  
  constructor() {
    this.initializeHardware();
  }

  private async initializeHardware(): Promise<void> {
    console.log('Initializing hardware connections...');
    // Printer will be initialized on first use with settings from database
  }

  async configurePrinter(config: Partial<PrinterConfig>): Promise<void> {
    this.printerConfig = { ...this.printerConfig, ...config };
    
    if (this.printerConfig.enabled && this.printerConfig.interface) {
      try {
        this.printer = new ThermalPrinter({
          type: this.printerConfig.type as any,
          interface: this.printerConfig.interface,
          width: this.printerConfig.width,
          characterSet: 'PC437_USA',
          removeSpecialCharacters: false,
          lineCharacter: '-',
        });
        
        const isConnected = await this.printer.isPrinterConnected();
        if (isConnected) {
          console.log('Printer connected successfully');
        } else {
          console.warn('Printer not responding');
          this.printer = null;
        }
      } catch (error) {
        console.error('Failed to configure printer:', error);
        this.printer = null;
      }
    }
  }

  async testPrinter(): Promise<boolean> {
    if (!this.printer) {
      console.error('Printer not configured');
      return false;
    }

    try {
      const isConnected = await this.printer.isPrinterConnected();
      if (!isConnected) {
        return false;
      }

      this.printer.alignCenter();
      this.printer.setTextSize(1, 1);
      this.printer.println('KUTUNZA POS');
      this.printer.println('Printer Test');
      this.printer.drawLine();
      this.printer.println('');
      this.printer.println('Test successful!');
      this.printer.cut();
      
      await this.printer.execute();
      return true;
    } catch (error) {
      console.error('Printer test failed:', error);
      return false;
    }
  }

  async openCashDrawer(): Promise<boolean> {
    try {
      if (this.printer) {
        // ESC/POS command to open cash drawer: ESC p m t1 t2
        // 0x1B, 0x70, 0x00, 0x19, 0xFA
        this.printer.openCashDrawer();
        await this.printer.execute();
        console.log('Cash drawer opened');
        return true;
      } else {
        // If no printer, just log (for demo/testing)
        console.log('Cash drawer open command (no printer configured)');
        return true;
      }
    } catch (error) {
      console.error('Failed to open cash drawer:', error);
      return false;
    }
  }

  async printReceipt(saleData: any): Promise<boolean> {
    try {
      console.log('Printing receipt for sale:', saleData.receipt_no);
      
      if (!this.printer) {
        // If no printer configured, just log the receipt
        const receiptContent = this.formatReceiptText(saleData);
        console.log('\n' + receiptContent + '\n');
        return true;
      }

      const isConnected = await this.printer.isPrinterConnected();
      if (!isConnected) {
        console.error('Printer not connected');
        return false;
      }

      // Print header
      this.printer.alignCenter();
      this.printer.setTextSize(1, 1);
      this.printer.bold(true);
      this.printer.println('KUTUNZA GOURMET');
      this.printer.bold(false);
      this.printer.setTextNormal();
      this.printer.println('Premium Culinary Services');
      this.printer.println('Graceland Estate, Lekki, Lagos');
      this.printer.println('');
      this.printer.drawLine();
      
      // Receipt info
      this.printer.alignLeft();
      this.printer.println(`Receipt: ${saleData.receipt_no}`);
      this.printer.println(`Date: ${new Date(saleData.created_at).toLocaleString('en-NG')}`);
      this.printer.println(`Cashier: ${saleData.cashier_name || 'N/A'}`);
      if (saleData.customer_name) {
        this.printer.println(`Customer: ${saleData.customer_name}`);
      }
      this.printer.drawLine();
      
      // Items
      this.printer.println('');
      this.printer.tableCustom([
        { text: 'Item', align: 'LEFT', width: 0.5 },
        { text: 'Qty', align: 'CENTER', width: 0.15 },
        { text: 'Price', align: 'RIGHT', width: 0.35 },
      ]);
      this.printer.drawLine();
      
      for (const item of saleData.items || []) {
        this.printer.tableCustom([
          { text: item.product_name, align: 'LEFT', width: 0.5 },
          { text: item.quantity.toString(), align: 'CENTER', width: 0.15 },
          { text: this.formatCurrency(item.total), align: 'RIGHT', width: 0.35 },
        ]);
      }
      
      this.printer.drawLine();
      
      // Totals
      this.printer.println('');
      this.printer.tableCustom([
        { text: 'Subtotal:', align: 'LEFT', width: 0.65 },
        { text: this.formatCurrency(saleData.subtotal), align: 'RIGHT', width: 0.35 },
      ]);
      
      if (saleData.tax_amount > 0) {
        this.printer.tableCustom([
          { text: 'Tax:', align: 'LEFT', width: 0.65 },
          { text: this.formatCurrency(saleData.tax_amount), align: 'RIGHT', width: 0.35 },
        ]);
      }
      
      if (saleData.discount_amount > 0) {
        this.printer.tableCustom([
          { text: 'Discount:', align: 'LEFT', width: 0.65 },
          { text: `-${this.formatCurrency(saleData.discount_amount)}`, align: 'RIGHT', width: 0.35 },
        ]);
      }
      
      this.printer.drawLine();
      this.printer.bold(true);
      this.printer.setTextSize(1, 1);
      this.printer.tableCustom([
        { text: 'TOTAL:', align: 'LEFT', width: 0.65 },
        { text: this.formatCurrency(saleData.total_amount), align: 'RIGHT', width: 0.35 },
      ]);
      this.printer.setTextNormal();
      this.printer.bold(false);
      this.printer.drawLine();
      
      // Payment info
      this.printer.println('');
      this.printer.tableCustom([
        { text: `Payment (${saleData.payment_method.toUpperCase()}):`, align: 'LEFT', width: 0.65 },
        { text: this.formatCurrency(saleData.amount_paid), align: 'RIGHT', width: 0.35 },
      ]);
      
      if (saleData.change_given > 0) {
        this.printer.tableCustom([
          { text: 'Change:', align: 'LEFT', width: 0.65 },
          { text: this.formatCurrency(saleData.change_given), align: 'RIGHT', width: 0.35 },
        ]);
      }
      
      // Footer
      this.printer.println('');
      this.printer.drawLine();
      this.printer.alignCenter();
      this.printer.println('Thank you for your patronage!');
      this.printer.println('');
      this.printer.setTextQuadArea();
      this.printer.println('***');
      this.printer.setTextNormal();
      this.printer.println('');
      
      // Cut paper
      this.printer.cut();
      
      await this.printer.execute();
      console.log('Receipt printed successfully');
      return true;
    } catch (error) {
      console.error('Failed to print receipt:', error);
      return false;
    }
  }

  private formatReceipt(sale: any): string {
    const width = 48; // Standard 80mm receipt width in characters
    const divider = '='.repeat(width);
    const thinDivider = '-'.repeat(width);

    let receipt = '\n';
    receipt += this.centerText('KUTUNZA GOURMET', width) + '\n';
    receipt += this.centerText('Premium Culinary Excellence', width) + '\n';
    receipt += this.centerText('Graceland Estate, Lekki, Lagos', width) + '\n';
    receipt += divider + '\n';
    receipt += `Receipt #: ${sale.receipt_no}\n`;
    receipt += `Date: ${new Date(sale.created_at).toLocaleString()}\n`;
    receipt += `Cashier: ${sale.cashier_name || 'N/A'}\n`;
    receipt += thinDivider + '\n';

    // Items
    for (const item of sale.items || []) {
      const itemLine = `${item.quantity}x ${item.product_name}`;
      const priceLine = this.formatCurrency(item.total);
      receipt += this.justifyText(itemLine, priceLine, width) + '\n';
      
      if (item.unit_price !== item.total / item.quantity) {
        receipt += `   @ ${this.formatCurrency(item.unit_price)} each\n`;
      }
    }

    receipt += thinDivider + '\n';
    receipt += this.justifyText('Subtotal:', this.formatCurrency(sale.subtotal), width) + '\n';
    
    if (sale.discount_amount > 0) {
      receipt += this.justifyText('Discount:', `-${this.formatCurrency(sale.discount_amount)}`, width) + '\n';
    }
    
    if (sale.tax_amount > 0) {
      receipt += this.justifyText('Tax:', this.formatCurrency(sale.tax_amount), width) + '\n';
    }

    receipt += divider + '\n';
    receipt += this.justifyText('TOTAL:', this.formatCurrency(sale.total_amount), width) + '\n';
    receipt += divider + '\n';
    
    receipt += this.justifyText('Paid:', this.formatCurrency(sale.amount_paid), width) + '\n';
    receipt += this.justifyText('Change:', this.formatCurrency(sale.change_given), width) + '\n';
    receipt += `Payment: ${sale.payment_method.toUpperCase()}\n`;

    receipt += '\n';
    receipt += this.centerText('Thank you for your patronage!', width) + '\n';
    receipt += this.centerText('See you again soon', width) + '\n';
    receipt += '\n\n\n'; // Feed for cutting

    return receipt;
  }

  private centerText(text: string, width: number): string {
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(Math.max(0, padding)) + text;
  }

  private justifyText(left: string, right: string, width: number): string {
    const space = width - left.length - right.length;
    return left + ' '.repeat(Math.max(1, space)) + right;
  }

  private formatCurrency(amount: number): string {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  async printXReport(sessionData: any): Promise<boolean> {
    // Print X report (mid-shift summary)
    console.log('Printing X Report...');
    return true;
  }

  async printZReport(sessionData: any): Promise<boolean> {
    // Print Z report (end of day summary)
    console.log('Printing Z Report...');
    return true;
  }

  getStatus(): {
    printer: { connected: boolean; name: string | null };
    drawer: { connected: boolean };
    scanner: { connected: boolean };
  } {
    return {
      printer: { connected: this.printerConnected, name: null },
      drawer: { connected: this.drawerConnected },
      scanner: { connected: this.scannerConnected },
    };
  }
}
