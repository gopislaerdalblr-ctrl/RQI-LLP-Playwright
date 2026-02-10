import {
  IWorldOptions,
  setWorldConstructor,
  World as CucumberWorld,
} from "@cucumber/cucumber";
import { Browser, BrowserContext, Page } from "playwright";

export class World extends CucumberWorld {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;

  // runtime / config
  instance: any;
  adminEmail!: string;
  adminPassword!: string;
  // runtime values captured during execution
  sourceId?: string;

  // NEW: console logs for report attachments
  consoleLogs!: string[];

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(World);
