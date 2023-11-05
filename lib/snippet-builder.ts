#!/usr/bin/env node
import snippetBuilder from './builder/snippet';
import configLoader from './builder/config';
import * as dotenv from 'dotenv';
dotenv.config();


const builderOption = configLoader.getSnippetOption();
snippetBuilder.setOption(builderOption);

snippetBuilder.build();
