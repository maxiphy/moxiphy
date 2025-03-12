# Moxiphy: CSV Completion & Enrichment Tool

<p align="center">
  <img src="public/moxiphy-logo.png" alt="Moxiphy Logo" width="120" />
</p>

## About Moxiphy

Moxiphy is a powerful data enrichment tool developed by [Maxiphy Solutions](https://maxiphy.com), a UX-driven software company specializing in innovative digital solutions. This tool streamlines the process of completing and enhancing product data for e-commerce and inventory management systems.

With Moxiphy, you can transform incomplete CSV datasets into rich, detailed product information using AI-powered completion and image enrichment capabilities. The application leverages OpenAI's advanced language models to intelligently fill in missing data fields and integrates with image APIs to automatically source relevant product visuals.

## Features

- **CSV Upload**: Drag and drop or select CSV files for processing
- **Data Visualization**: View your CSV data in a paginated table format
- **AI-Powered Completion**: Automatically fill in missing data fields using OpenAI
- **Image Enrichment**: Fetch relevant images for products based on their details
- **CSV Export**: Download the completed and enriched CSV file
- **Secure Access**: PIN-protected access for team members only
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **CSV Parsing**: PapaParse
- **AI Integration**: OpenAI API
- **Image APIs**: Unsplash and/or Pexels
- **UI Components**: Custom components with responsive design

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- OpenAI API key
- Unsplash API key or Pexels API key

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd moxiphy
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Set up environment variables

Copy the example environment file and add your API keys:

```bash
cp env.example .env.local
```

Edit `.env.local` and add your API keys:

```
OPENAI_API_KEY=your_openai_api_key_here
UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
# OR
PEXELS_API_KEY=your_pexels_api_key_here

# 6-digit PIN for application access
NEXT_PUBLIC_ACCESS_PIN=123456
```

4. Run the development server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Usage

1. **Access the application**: Enter the 6-digit PIN to access the protected application
2. **Upload a CSV file**: Drag and drop a CSV file or click to select one
3. **Review the data**: The CSV data will be displayed in a table format
4. **Complete missing data**: Click the "Complete Data" button to fill in missing fields using AI
5. **Enrich with images**: Click the "Enrich with Images" button to add relevant product images
6. **Download the enriched CSV**: Click the "Download CSV" button to get your completed file

## Sample Data

A sample CSV file is included in the `/public` directory for testing purposes. You can access it at:

```
/public/sample.csv
```

## Project Structure

```
/app
  /api
    /complete-data   # OpenAI integration for completing data
    /fetch-images    # Unsplash/Pexels integration for images
  /components
    /ui              # UI components (FileUpload, DataTable, Button)
  /context           # React context providers
  /hooks             # Custom React hooks
  /lib               # Utility functions
  /types             # TypeScript type definitions
/public              # Static files including sample data
```

## About Maxiphy Solutions

Maxiphy Solutions is a UX-driven software company specializing in creating innovative digital solutions that combine beautiful design with powerful functionality. Our team of experts is dedicated to delivering exceptional user experiences through thoughtful design and cutting-edge technology.

### Our Approach

At Maxiphy, we believe that great software starts with understanding user needs. Our development process puts UX at the forefront, ensuring that every product we create is not only powerful but also intuitive and enjoyable to use.

### Our Services

- **Custom Software Development**: Tailored solutions for unique business challenges
- **UX/UI Design**: Creating beautiful, intuitive interfaces that users love
- **Data Solutions**: Tools and platforms for managing, analyzing, and enriching data
- **AI Integration**: Leveraging artificial intelligence to create smarter applications

Visit [maxiphy.com](https://maxiphy.com) to learn more about our services and see our portfolio of work.

## License

This project is proprietary software owned by Maxiphy Solutions SARL. © 2025 Maxiphy Solutions. All rights reserved.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
