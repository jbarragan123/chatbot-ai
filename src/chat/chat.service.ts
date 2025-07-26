import { Injectable } from '@nestjs/common';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { OpenAIService } from './openai/openai.service';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';

export interface Product {
  displayTitle: string;       
  embeddingText: string;      
  url: string;                
  imageUrl: string;           
  productType: string;        
  discount: number;           
  price: number;              
  variants: string;           
  createDate: string;         
}

@Injectable()
export class ChatService {

  constructor(private readonly openaiService: OpenAIService) {}

  async processUserQuery(query: string): Promise<string> {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'user',
        content: query,
      },
    ];

    const functions = [
      {
        name: 'searchProducts',
        description: 'Search 2 relevant products from the catalog based on user query',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query, e.g., "phone", "gift for dad"',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'convertCurrencies',
        description: 'Converts an amount from one currency to another.',
        parameters: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'The amount of money to convert',
            },
            fromCurrency: {
              type: 'string',
              description: 'The 3-letter currency code to convert from (e.g., EUR)',
            },
            toCurrency: {
              type: 'string',
              description: 'The 3-letter currency code to convert to (e.g., USD, COP)',
            },
          },
          required: ['amount', 'fromCurrency', 'toCurrency'],
        },
      },
    ];

    //First call
    const firstResponse = await this.openaiService.chatWithFunctions(messages, functions);

    if (firstResponse.function_call) {
      const { name: functionName, arguments: functionArgs } = firstResponse.function_call;
      const parsedArgs = JSON.parse(functionArgs || '{}');

      let functionResult = '';

      if (functionName === 'searchProducts') {
        functionResult = await this.searchProducts(parsedArgs.query);
      } else if (functionName === 'convertCurrencies') {
        const { amount, fromCurrency, toCurrency } = parsedArgs;
        functionResult = await this.convertCurrencies(amount, fromCurrency, toCurrency);
      }

      // Second call
      const secondResponse = await this.openaiService.chatWithFunctions(
        [
          ...messages,
          firstResponse,
          {
            role: 'function',
            name: functionName,
            content: functionResult,
          },
        ],
        functions,
      );

      return secondResponse.content || '[No final response]';
    }

    return firstResponse.content || '[No function used]';
  }


  private async searchProducts(query: string): Promise<string> {
    const matchedResults: Product[] = [];
    const allProducts: Product[] = [];
    const filePath = path.join(__dirname, '..', '..', 'data', 'Full Stack Test products_list.csv');

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: Product) => {
          const lowerQuery = query.toLowerCase();
          const matchInName = row.displayTitle.toLowerCase().includes(lowerQuery);
          const matchInDesc = row.embeddingText.toLowerCase().includes(lowerQuery);

          allProducts.push(row);

          if (matchInName || matchInDesc) {
            matchedResults.push(row);
          }
        })
        .on('end', () => {
          let selectedProducts: Product[];
          let messageHeader: string;

          if (matchedResults.length > 0) {
            selectedProducts = matchedResults.slice(0, 2);
            messageHeader = `Here are some products related to your query: "${query}"\n`;
          } else {
            // Fallback: return 2 random products
            const shuffled = allProducts.sort(() => 0.5 - Math.random());
            selectedProducts = shuffled.slice(0, 2);
            messageHeader = `I couldn’t find any specific products for "${query}", but here are a couple of other options you might like:\n`;
          }

          const formatted = selectedProducts
            .map(
              (p, i) =>
                `${i + 1}. **${p.displayTitle}**\n` +
                `   - ${p.embeddingText}\n` +
                `   - Price: $${p.price} USD`
            )
            .join('\n\n');

          resolve(`${messageHeader}\n${formatted}\n\nWould any of these interest you?`);
        })
        .on('error', (err) => reject(err));
    });
  }



  private async convertCurrencies(amount: number, fromCurrency: string, toCurrency: string): Promise<string> {
    const API_KEY = process.env.OPEN_EXCHANGE_RATES_API_KEY;
    const url = `https://api.fastforex.io/fetch-multi?from=${fromCurrency}&to=${toCurrency}&api_key=${API_KEY}`;

    try {
      const response = await axios.get(url);
      const rates = response.data.results;

      if (!rates || Object.keys(rates).length === 0) {
        return `No conversion rates found for ${fromCurrency} to ${toCurrency}.`;
      }

      let resultStrings: string[] = [];

      for (const [currency, rate] of Object.entries(rates)) {
        const convertedAmount = amount * Number(rate);
        resultStrings.push(`${amount} ${fromCurrency} ≈ ${convertedAmount.toFixed(2)} ${currency}`);
      }

      return resultStrings.join(' | ');
    } catch (error) {
      console.error('Error fetching exchange rates:', error.message);
      return 'An error occurred while converting currencies.';
    }
  }
}
