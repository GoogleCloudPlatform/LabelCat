// Copyright 2015, Google, Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

module.exports = function (Promise, Model, container, messages) {
  let Repo = container.get('Repo');
  
  return {
    // GET /api/models/:id
    findOneById: Promise.coroutine(function* (req, res) {
      let model = yield Model.findOneById(req.params.id);
      if (!model) {
        return res.status(404).end();
      } else {
        return res.status(200).json(model.toJSON()).end();
      }
    }),

    // GET /api/models
    findAll: Promise.coroutine(function* (req, res) {
      let models = yield Model.findAll(req.query);
      return res.status(200).json(models.map(function (model) {
        return model.toJSON();
      })).end();
    }),

    // POST /api/models
    createOne: Promise.coroutine(function* (req, res) {
      req.body.userId = req.user.data.id;
      let model = yield Model.createOne(req.body);
      return res.status(201).json(model.toJSON()).end();
    }),

    // PUT /api/models/:id
    updateOneById: Promise.coroutine(function* (req, res) {
      let model = yield Model.findOneById(req.params.id);
      if (!model || model.get('userId') !== req.user.data.id) {
        return res.status(404).end();
      } else {
        model.set(req.body);
        yield model.save();
        return res.status(200).json(model.toJSON()).end();
      }
    }),

    // DELETE /api/models/:id
    destroyOneById: Promise.coroutine(function* (req, res) {
      yield Model.destroyOneById(req.params.id);
      return res.status(204).end();
    }),

    // POST /api/models/:id/train
    train: Promise.coroutine(function* (req, res) {
      let model = yield Model.findOneById(req.params.id);

      if (!model) {
        return res.status(404).end();
      } else if (model.get('trainingStatus') === 'RUNNING') {
        return res.status(400).send('Model is not ready to be trained!').end();
      } else {
        model.set('trainingStatus', 'QUEUED');
        yield model.save()
        yield messages.sendMessage('train', model.get('id'));
        return res.status(200).send().end();
      }
    })
  };
};