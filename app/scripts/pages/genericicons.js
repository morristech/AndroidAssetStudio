/*
 * Copyright 2016 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {studio} from '../studio';
import {imagelib} from '../imagelib';
import {BaseGenerator} from './basegenerator';

const ICON_SIZE = {w: 24, h: 24};
const TARGET_RECT = {x: 1, y: 1, w: 22, h: 22};

export class GenericIconGenerator extends BaseGenerator {
  setupForm() {
    super.setupForm();

    let nameField;
    this.form = new studio.Form({
      id: 'iconform',
      container: '#inputs-form',
      fields: [
        new studio.ImageField('source', {
          title: 'Source',
          helpText: 'Must be transparent',
          maxFinalSize: { w: 720, h: 720 }, // max render size, for SVGs
          defaultValueClipart: 'ac_unit',
          dropTarget: document.body
        }),
        new studio.RangeField('size', {
          newGroup: true,
          title: 'Asset size',
          helpText: 'Size of the final asset',
          min: 4,
          max: 200,
          defaultValue: 32,
          textFn: d => `${d}dp`,
        }),
        new studio.RangeField('padding', {
          title: 'Asset padding',
          helpText: 'Padding around the icon asset',
          defaultValue: 8,
          textFn: d => `${d}dp`,
        }),
        new studio.ColorField('color', {
          title: 'Color',
          helpText: 'Flat foreground color',
          defaultValue: 'rgba(0, 0, 0, 0.54)',
          alpha: true
        }),
        (nameField = new studio.TextField('name', {
          title: 'Name',
          helpText: 'Used when generating ZIP files as the resource name.',
          defaultValue: 'ic_example'
        }))
      ]
    });
    this.form.onChange(field => {
      let values = this.form.getValues();
      if ((!field || field.id_ == 'source')
          && values.source && values.source.name) {
        let name = 'ic_' + studio.Util.sanitizeResourceName(values.source.name);
        if (name != nameField.getValue()) {
          nameField.setValue(name);
        }
      }

      this.regenerateDebounced_();
    });
  }

  regenerate() {
    let values = this.form.getValues();

    this.zipper.clear();
    this.zipper.setZipFilename(`${values.name}.zip`);

    this.densities.forEach(density => {
      let mult = studio.Util.getMultBaseMdpi(density);
      let totalSize = values.size;
      let padding = Math.min(values.size / 2, values.padding);
      let iconSize = studio.Util.multRound(
          {w: totalSize, h: totalSize}, mult);
      let targetRect = studio.Util.multRound(
          {x: padding, y: padding, w: totalSize - padding * 2, h: totalSize - padding * 2}, mult);

      let outCtx = imagelib.Drawing.context(iconSize);
      let tmpCtx = imagelib.Drawing.context(iconSize);

      if (values.source.ctx) {
        let srcCtx = values.source.ctx;
        imagelib.Drawing.drawCenterInside(
            tmpCtx,
            srcCtx,
            targetRect,
            {x: 0, y: 0, w: srcCtx.canvas.width, h: srcCtx.canvas.height});
      }

      let color = values.color;
      let alpha = color.getAlpha();
      color.setAlpha(1);

      imagelib.Effects.fx([
        {effect: 'fill-color', color: color.toRgbString(), opacity: alpha}
      ], outCtx, tmpCtx, iconSize);

      this.zipper.add({
        name: `res/drawable-${density}/${values.name}.png`,
        canvas: outCtx.canvas
      });

      this.setImageForSlot_(density, outCtx.canvas.toDataURL());
    });
  }
}
