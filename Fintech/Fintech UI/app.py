from flask import Flask, request, send_file, jsonify, render_template
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import inch
from io import BytesIO

app = Flask(__name__)


# Home route to render index.html
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/generate-pdf', methods=['POST'])
def generate_pdf():
    try:
        data = request.json  # JSON object sent from frontend
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)

        # Page border
        def draw_page_border():
            c.setStrokeColor(colors.HexColor("#003366"))  # Dark blue border
            c.setLineWidth(2)
            c.rect(30, 30, 550, 750)

        # Section title
        def draw_section_title(title, y, color=colors.HexColor("#003366")):
            c.setFont("Helvetica-Bold", 12)
            c.setFillColor(color)
            c.drawString(50, y, title)
            c.setStrokeColor(color)
            c.setLineWidth(1)
            c.line(50, y - 5, 550, y - 5)
            return y - 20

        # Key-Value pair (single line item)
        def draw_key_value_pair(key, value, y):
            c.setFont("Helvetica", 11)
            c.setFillColor(colors.black)
            c.drawString(60, y, f"{key}:")
            c.drawString(200, y, str(value))
            return y - 15



        # Header (Report Title & Date)
        c.setFont("Helvetica-Bold", 16)
        c.setFillColor(colors.HexColor("#003366"))
        c.drawString(400, 760, "TAX REPORT")
        c.setFont("Helvetica", 11)
        c.setFillColor(colors.black)
        c.drawString(50, 755, f"Generated On: {data['timestamp']}")

        # Draw border
        draw_page_border()

        y = 740

        # Taxpayer Information - Boxed

        y -= 15
        y = draw_section_title("Taxpayer Information", y, colors.HexColor("#007acc"))
        y = draw_key_value_pair("Category", data['taxpayerInfo']['category'], y)
        y = draw_key_value_pair("Country", data['taxpayerInfo']['jurisdiction'], y)
        y -= 15

        # Financial Data - Boxed

        y = draw_section_title("Financial Data", y, colors.HexColor("#007acc"))
        y = draw_key_value_pair("Gross Income", data['financialData']['grossIncome'], y)
        y = draw_key_value_pair("Expenses", data['financialData']['expenses'], y)

        y -= 5
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(colors.HexColor("#005599"))
        c.drawString(60, y, "Deductions:")
        y -= 15

        c.setFont("Helvetica", 11)
        c.setFillColor(colors.black)
        for key, value in data['financialData']['deductions'].items():
            y = draw_key_value_pair(key.capitalize(), value, y)

        y -= 10

        # Tax Calculations
        y = draw_section_title("Tax Calculations", y, colors.HexColor("#007acc"))
        for key, value in data['calculations'].items():
            y = draw_key_value_pair(key.replace('_', ' ').capitalize(), value, y)

        y -= 10

        # Tax Brackets
        y = draw_section_title("Tax Brackets", y, colors.HexColor("#007acc"))
        for bracket in data['taxBrackets']:
            range_text = f"{bracket['min']} - {bracket['max']}"
            y = draw_key_value_pair(f"Rate {bracket['rate']}%", f"Income Range: {range_text}", y)

        y -= 10

        # Category Benefits
        y = draw_section_title("Category Benefits", y, colors.HexColor("#007acc"))
        for benefit, description in data['categoryBenefits'].items():
            y = draw_key_value_pair(benefit, description, y)

        # Footer
        c.setFont("Helvetica-Oblique", 9)
        c.setFillColor(colors.darkgray)
        c.drawString(50, 40, "This report was auto-generated for informational purposes.")

        c.showPage()
        c.save()

        buffer.seek(0)
        return send_file(buffer, mimetype='application/pdf', as_attachment=True, download_name='Tax_Report.pdf')

    except Exception as e:
        print(f"Error generating PDF: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5050)

