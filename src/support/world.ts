import {
  IWorldOptions,
  setWorldConstructor,
  World as CucumberWorld,
} from "@cucumber/cucumber";
import { Browser, BrowserContext, Page } from "playwright";
import type { HealMeta } from "./healwright";
import { isHealEnabled } from "./healwright";

export class World extends CucumberWorld {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page & any;

  // Tab for Moodle execution
  moodlePage!: Page;

  // runtime / config
  instance: any;
  adminEmail!: string;
  adminPassword!: string;

  // Storage for the user created on the fly
  lastCreatedMoodleUser: any;

  // runtime values captured during execution
  sourceId?: string;
  consoleLogs!: string[];

  // healwright tracking
  heal!: HealMeta;

  constructor(options: IWorldOptions) {
    super(options);
    this.consoleLogs = [];
    this.heal = {
      enabled: isHealEnabled(),
      used: false,
      messages: [],
    };
  }
}

setWorldConstructor(World);
