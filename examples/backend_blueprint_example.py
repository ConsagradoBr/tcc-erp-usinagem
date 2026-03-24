"""Example: create_example_blueprint

This module provides a small example of creating a Flask Blueprint
compatible with the project factory pattern.
"""

def create_example_blueprint():
    from flask import Blueprint, jsonify
    bp = Blueprint('example', __name__, url_prefix='/example')

    @bp.route('/', methods=['GET'])
    def index():
        return jsonify({'message': 'example ok'})

    return bp


if __name__ == '__main__':
    print('Import create_example_blueprint() into your create_app() to register this blueprint.')
