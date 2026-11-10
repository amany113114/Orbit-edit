/* ==========================================================================
   ORBIT INDIAN GST TAX INVOICE CONTROLLER
   ========================================================================== */

function convertNumberToIndianWords(num) {
    if (!num || num <= 0) return "Rupees Zero Only";
    
    const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
                   "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function getBelowThousand(n) {
        let str = "";
        if (n >= 100) {
            str += units[Math.floor(n / 100)] + " Hundred ";
            n %= 100;
        }
        if (n >= 20) {
            str += tens[Math.floor(n / 10)] + " ";
            n %= 10;
        }
        if (n > 0) {
            str += units[n] + " ";
        }
        return str;
    }

    let rupees = Math.floor(num);
    let paise = Math.round((num - rupees) * 100);

    let crores = Math.floor(rupees / 10000000);
    rupees %= 10000000;
    let lakhs = Math.floor(rupees / 100000);
    rupees %= 100000;
    let thousands = Math.floor(rupees / 1000);
    rupees %= 1000;

    let parts = [];
    if (crores > 0) parts.push(getBelowThousand(crores).trim() + " Crore");
    if (lakhs > 0) parts.push(getBelowThousand(lakhs).trim() + " Lakh");
    if (thousands > 0) parts.push(getBelowThousand(thousands).trim() + " Thousand");
    if (rupees > 0) parts.push(getBelowThousand(rupees).trim());

    let wordResult = "Rupees " + parts.join(" ") + " Only";
    if (paise > 0) {
        wordResult = "Rupees " + parts.join(" ") + " and " + getBelowThousand(paise).trim() + " Paise Only";
    }
    return wordResult;
}

const OrbitGSTInvoice = {
    items: [
        { description: "Fullstack Web Platform Architecture & Design", hsn_sac: "998314", quantity: 1, unit: "NOS", unit_price: 125000.00 },
        { description: "AI Background Removal Model Integration", hsn_sac: "998313", quantity: 1, unit: "NOS", unit_price: 25000.00 }
    ],

    init() {
        this.renderTable();
        this.bindEvents();
    },

    bindEvents() {
        const addBtn = document.getElementById('inv-add-item');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.items.push({ description: "Software Service / HSN Item", hsn_sac: "998314", quantity: 1, unit: "NOS", unit_price: 10000.00 });
                this.renderTable();
            });
        }

        const gstSelect = document.getElementById('gst-rate-select');
        if (gstSelect) {
            gstSelect.addEventListener('change', () => this.calculateTotals());
        }

        document.querySelectorAll('input[name="gst_supply_type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.querySelectorAll('input[name="gst_supply_type"]').forEach(r => {
                    r.parentElement.classList.remove('selected');
                });
                e.target.parentElement.classList.add('selected');
                
                const isInter = (e.target.value === 'interstate');
                document.getElementById('row-igst').style.display = isInter ? 'flex' : 'none';
                document.getElementById('row-cgst-sgst').style.display = isInter ? 'none' : 'flex';
                this.calculateTotals();
            });
        });

        const form = document.getElementById('invoice-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    },

    renderTable() {
        const tbody = document.getElementById('inv-items-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        this.items.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" value="${item.description}" onchange="OrbitGSTInvoice.updateItem(${index}, 'description', this.value)"></td>
                <td><input type="text" value="${item.hsn_sac}" style="width:80px" onchange="OrbitGSTInvoice.updateItem(${index}, 'hsn_sac', this.value)"></td>
                <td><input type="number" step="0.1" value="${item.quantity}" style="width:65px" onchange="OrbitGSTInvoice.updateItem(${index}, 'quantity', this.value)"></td>
                <td><input type="text" value="${item.unit}" style="width:60px" onchange="OrbitGSTInvoice.updateItem(${index}, 'unit', this.value)"></td>
                <td><input type="number" step="0.01" value="${item.unit_price}" style="width:110px" onchange="OrbitGSTInvoice.updateItem(${index}, 'unit_price', this.value)"></td>
                <td style="font-weight:600; color:var(--primary-cyan)" id="inv-item-total-${index}">₹ ${(item.quantity * item.unit_price).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td>
                    <button type="button" class="btn-icon" style="width:30px;height:30px;" onclick="OrbitGSTInvoice.removeItem(${index})">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        this.calculateTotals();
    },

    updateItem(index, field, value) {
        if (field === 'quantity' || field === 'unit_price') {
            this.items[index][field] = parseFloat(value) || 0;
        } else {
            this.items[index][field] = value;
        }
        const totalCell = document.getElementById(`inv-item-total-${index}`);
        if (totalCell) {
            const rowVal = (this.items[index].quantity * this.items[index].unit_price);
            totalCell.textContent = `₹ ${rowVal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        }
        this.calculateTotals();
    },

    removeItem(index) {
        if (this.items.length <= 1) {
            showToast("Invoice must contain at least one item.", "error");
            return;
        }
        this.items.splice(index, 1);
        this.renderTable();
    },

    calculateTotals() {
        let taxable = 0;
        this.items.forEach(item => {
            taxable += (item.quantity * item.unit_price);
        });

        const rate = parseFloat(document.getElementById('gst-rate-select')?.value || 18);
        const supplyType = document.querySelector('input[name="gst_supply_type"]:checked')?.value || 'interstate';
        const isInterstate = (supplyType === 'interstate');

        let igst = 0, cgst = 0, sgst = 0;
        if (isInterstate) {
            igst = (taxable * rate) / 100;
        } else {
            cgst = (taxable * (rate / 2.0)) / 100;
            sgst = (taxable * (rate / 2.0)) / 100;
        }

        const grandTotal = taxable + igst + cgst + sgst;

        document.getElementById('gst-taxable-val').textContent = `₹ ${taxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        document.getElementById('gst-igst-val').textContent = `₹ ${igst.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        document.getElementById('gst-cgst-val').textContent = `₹ ${cgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        document.getElementById('gst-sgst-val').textContent = `₹ ${sgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        document.getElementById('gst-grand-total').textContent = `₹ ${grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;

        const words = convertNumberToIndianWords(grandTotal);
        document.getElementById('gst-words-preview').textContent = words;
    },

    async handleSubmit(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('inv-submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Compiling Indian GST PDF...</span>';

        const supplyType = document.querySelector('input[name="gst_supply_type"]:checked')?.value || 'interstate';
        const payload = {
            invoice_number: document.getElementById('gst-inv-num').value || "GST/2026-27/089",
            invoice_date: document.getElementById('gst-inv-date').value || new Date().toISOString().split('T')[0],
            due_date: "",
            supplier_name: document.getElementById('gst-sup-name').value,
            supplier_address: document.getElementById('gst-sup-addr').value,
            supplier_gstin: document.getElementById('gst-sup-gstin').value,
            supplier_pan: document.getElementById('gst-sup-pan').value,
            supplier_state: document.getElementById('gst-sup-state').value,
            supplier_state_code: document.getElementById('gst-sup-code').value,
            recipient_name: document.getElementById('gst-rec-name').value,
            recipient_address: document.getElementById('gst-rec-addr').value,
            recipient_gstin: document.getElementById('gst-rec-gstin').value,
            recipient_state: document.getElementById('gst-rec-state').value,
            recipient_state_code: document.getElementById('gst-rec-code').value,
            gst_rate: parseFloat(document.getElementById('gst-rate-select').value || 18),
            is_interstate: (supplyType === 'interstate'),
            place_of_supply: document.getElementById('gst-pos').value,
            notes: document.getElementById('gst-notes').value,
            items: this.items
        };

        try {
            const response = await fetch('/api/generate-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok && !response.headers.get('content-type')?.includes('text/html')) {
                const blob = await response.blob();
                const downloadUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `GST_Invoice_${payload.invoice_number.replace(/\//g, '_')}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                showToast("Official Indian GST Tax Invoice generated successfully!", "success");
            } else {
                this.generateClientInvoiceWindow(payload);
            }
        } catch (err) {
            this.generateClientInvoiceWindow(payload);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>Download Indian GST Tax Invoice (PDF)</span>
            `;
        }
    },

    generateClientInvoiceWindow(payload) {
        const win = window.open('', '', 'width=850,height=950');
        if (!win) {
            showToast("Please allow popups to download client invoice.", "error");
            return;
        }

        let itemsRows = '';
        let taxable = 0;
        payload.items.forEach((item, i) => {
            const rowTot = item.quantity * item.unit_price;
            taxable += rowTot;
            itemsRows += `
                <tr>
                    <td style="padding:8px; border:1px solid #ddd; text-align:center;">${i+1}</td>
                    <td style="padding:8px; border:1px solid #ddd;">${item.description}</td>
                    <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.hsn_sac}</td>
                    <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.quantity} ${item.unit}</td>
                    <td style="padding:8px; border:1px solid #ddd; text-align:right;">₹ ${item.unit_price.toFixed(2)}</td>
                    <td style="padding:8px; border:1px solid #ddd; text-align:right;">₹ ${rowTot.toFixed(2)}</td>
                </tr>
            `;
        });

        const rate = payload.gst_rate || 18;
        const isInter = payload.is_interstate;
        const igst = isInter ? (taxable * rate) / 100 : 0;
        const cgst = !isInter ? (taxable * (rate / 2.0)) / 100 : 0;
        const sgst = !isInter ? (taxable * (rate / 2.0)) / 100 : 0;
        const grandTotal = taxable + igst + cgst + sgst;
        const words = convertNumberToIndianWords(grandTotal);

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>GST TAX INVOICE - ${payload.invoice_number}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #111; line-height: 1.5; }
                    .header { display: flex; justify-content: space-between; border-bottom: 3px solid #00F0FF; padding-bottom: 15px; margin-bottom: 25px; }
                    .title { font-size: 26px; font-weight: 800; color: #0077cc; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th { background: #f0f4f8; padding: 10px; border: 1px solid #ccc; font-size: 13px; text-transform: uppercase; }
                    .totals-table { width: 360px; margin-left: auto; margin-top: 15px; }
                    .words-box { background: #f8f9fa; border: 1px dotted #888; padding: 12px; margin-top: 25px; font-weight: 600; font-size: 14px; }
                    .btn-print { padding: 12px 24px; background: linear-gradient(135deg, #00FF9D, #00F0FF); color: #070913; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 15px; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="no-print" style="text-align:right; margin-bottom:20px;">
                    <button class="btn-print" onclick="window.print()">🖨️ PRINT / SAVE AS PDF INVOICE</button>
                </div>
                <div class="header">
                    <div>
                        <div class="title">GST TAX INVOICE</div>
                        <div style="font-size:18px; font-weight:bold; margin-top:5px;">${payload.supplier_name}</div>
                        <div>${payload.supplier_address}</div>
                        <div><strong>GSTIN:</strong> ${payload.supplier_gstin} | <strong>PAN:</strong> ${payload.supplier_pan}</div>
                    </div>
                    <div style="text-align:right;">
                        <div><strong>Invoice No:</strong> ${payload.invoice_number}</div>
                        <div><strong>Date:</strong> ${payload.invoice_date}</div>
                        <div><strong>State:</strong> ${payload.supplier_state} (${payload.supplier_state_code})</div>
                    </div>
                </div>
                <div style="margin-bottom:20px; background:#fbfbfb; padding:15px; border-radius:6px; border:1px solid #eee;">
                    <strong>Billed To (Recipient / Buyer):</strong><br>
                    <span style="font-size:16px; font-weight:bold;">${payload.recipient_name}</span><br>
                    ${payload.recipient_address}<br>
                    <strong>GSTIN:</strong> ${payload.recipient_gstin} | <strong>State:</strong> ${payload.recipient_state} (${payload.recipient_state_code})
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Item Description</th>
                            <th>HSN/SAC</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>${itemsRows}</tbody>
                </table>
                <table class="totals-table">
                    <tr><td style="padding:6px 0;">Taxable Amount:</td><td style="text-align:right; font-weight:bold;">₹ ${taxable.toFixed(2)}</td></tr>
                    ${isInter ? `<tr><td style="padding:6px 0;">IGST (${rate}%):</td><td style="text-align:right;">₹ ${igst.toFixed(2)}</td></tr>` : `<tr><td style="padding:6px 0;">CGST (${rate/2}%):</td><td style="text-align:right;">₹ ${cgst.toFixed(2)}</td></tr><tr><td style="padding:6px 0;">SGST (${rate/2}%):</td><td style="text-align:right;">₹ ${sgst.toFixed(2)}</td></tr>`}
                    <tr style="font-size:18px; font-weight:bold; border-top:2px solid #111;"><td style="padding:10px 0;">Grand Total:</td><td style="text-align:right; color:#0077cc;">₹ ${grandTotal.toFixed(2)}</td></tr>
                </table>
                <div class="words-box">Amount in Words: ${words}</div>
                <div style="margin-top:30px; font-size:12px; color:#666;">Notes & Terms: ${payload.notes || 'Thank you for your business. Electronic Invoice generated via ORBIT Engine.'}</div>
            </body>
            </html>
        `;
        win.document.write(html);
        win.document.close();
        showToast("Netlify Engine: GST Tax Invoice opened in PDF Print View!", "success");
    }
};

document.addEventListener('DOMContentLoaded', () => OrbitGSTInvoice.init());
